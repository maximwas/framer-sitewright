import { DSL_VARIABLE_TYPE } from "../constants/dsl.ts";
import { XML_RUN_CONTAINER_TYPES } from "../constants/xml.ts";
import { addNode, deleteNode, setNode } from "../dsl/commands.ts";
import type { DslValue } from "../types/dsl.ts";
import type { XmlCompiled, XmlElementNode, XmlParent, XmlVariable } from "../types/xml.ts";
import { positionalChildId } from "../utils/text-ids.ts";
import { parseXml } from "./parse-xml.ts";
import { attributesOfElement, ownProp } from "./xml-attributes.ts";
import { invalidXml } from "./xml-errors.ts";
import { assignKeys, resolveKeyReferences } from "./xml-keys.ts";
import { existingContentId, joinAdjacentText, textAttribute } from "./xml-text.ts";
import { expandListAttribute } from "./xml-values.ts";

/**
 * XML as DSL commands, in tree order. An element without `id` is created under its enclosing element (a top-level one
 * under its `parent` attribute); an element with `id` gets a SET of the attributes it lists, and `$delete="true"`
 * deletes it. Nesting an existing node only addresses it: nothing moves, and children left out stay. Inside an existing
 * rich text, blocks and runs without `id` are the ones at that position, as nodes_read prints them; a `key` makes one
 * new instead. `@key` in any value (an id, `scope`, `component`, `var(--variable-@key)`) is that element's temp id.
 * `nextTempId` must be unique per session.
 */
export function xmlToDsl(source: string, nextTempId: (base: string) => string): XmlCompiled {
  const roots = parseXml(source);
  const compiler = new XmlCompiler(nextTempId, assignKeys(roots, nextTempId));

  for (const root of roots) {
    if (root.kind === "text") {
      throw invalidXml(root, "Text must be inside a <RichTextNode>.");
    }

    compiler.element(root, null, 0);
  }

  return {
    commands: variablesBeforeUse(compiler.commands, compiler.variables),
    keys: compiler.keys,
    variables: compiler.variables,
  };
}

/**
 * The commands with each new variable moved up to just before the first command that binds it: Framer looks a
 * `var(--variable-…)` up when the binding is applied, so a variable written after the text using it is "not found"
 * (seen 01.10.2026). The binding sits inside the variable's scope, so the scope is created before either.
 */
function variablesBeforeUse(commands: readonly string[], variables: readonly XmlVariable[]): string[] {
  const ordered = [...commands];

  for (const { tempId } of variables) {
    const created = ordered.findIndex(
      (command) => command.startsWith("+") && command.split(" ")[1]?.replace(/;$/, "") === tempId,
    );
    const used = ordered.findIndex((command) => command.includes(`var(--variable-${tempId})`));

    if (created > used && used !== -1) {
      const [command] = ordered.splice(created, 1);

      if (command !== undefined) {
        ordered.splice(used, 0, command);
      }
    }
  }

  return ordered;
}

class XmlCompiler {
  readonly commands: string[] = [];
  readonly keys: Readonly<Record<string, string>>;
  readonly variables: XmlVariable[] = [];
  readonly #nextTempId: (base: string) => string;

  constructor(nextTempId: (base: string) => string, keys: Readonly<Record<string, string>>) {
    this.#nextTempId = nextTempId;
    this.keys = keys;
  }

  element(element: XmlElementNode, parent: XmlParent | null, position: number): void {
    const written = ownProp(element, "id");
    const id = written === null ? existingContentId(element, parent, position) : this.#resolve(written);

    if (element.props.$delete !== undefined) {
      this.#delete(element, id);
    } else if (id === null) {
      this.#create(element, parent);
    } else {
      this.#update(element, id, parent);
    }
  }

  #delete(element: XmlElementNode, id: string | null): void {
    const onlyDelete = Object.keys(element.props).every((key) => key === "id" || key === "$delete");

    if (id === null || element.props.$delete !== "true" || !onlyDelete || element.children.length > 0) {
      throw invalidXml(element, `$delete takes an id and nothing else: <${element.type} id="…" $delete="true" />.`);
    }

    this.commands.push(deleteNode(id));
  }

  #update(element: XmlElementNode, id: string, parent: XmlParent | null): void {
    if (element.props.key !== undefined) {
      throw invalidXml(element, "key names a new element; this one has an id, so it exists already.");
    }

    if (parent?.isNew) {
      throw invalidXml(element, `Node ${id} exists, so it cannot go inside a new element. Move it with MOVE in dsl.`);
    }

    const runs = XML_RUN_CONTAINER_TYPES.has(element.type);
    const attributes = this.#attributes(element);
    const text = runs ? null : textAttribute(element);

    if (text !== null) {
      attributes.text = text;
    }

    if (Object.keys(attributes).length > 0) {
      this.commands.push(setNode(id, attributes));
    }

    const self = {
      id,
      type: element.type,
      isNew: false,
    };

    // In an existing block, text at a position is the run there.
    element.children.forEach((child, position) => {
      if (child.kind === "element") {
        this.element(child, self, position);
      } else if (runs) {
        this.commands.push(setNode(positionalChildId(id, position), { text: child.value }));
      }
    });
  }

  #create(element: XmlElementNode, parent: XmlParent | null): void {
    const tempId = this.#tempIdFor(element);
    const runs = XML_RUN_CONTAINER_TYPES.has(element.type);
    const text = runs ? null : textAttribute(element);
    const attributes: Record<string, DslValue> = {
      ...this.#placement(element, parent),
      ...this.#attributes(element, ["parent"]),
    };

    if (text !== null) {
      attributes.text = text;
    }

    this.commands.push(addNode(element.type, tempId, attributes));
    this.#noteVariable(element, tempId, attributes);

    const self = {
      id: tempId,
      type: element.type,
      isNew: true,
    };

    // A new block's text becomes runs, in order with the runs written as elements.
    for (const child of runs ? joinAdjacentText(element.children) : element.children) {
      if (child.kind === "element") {
        this.element(child, self, 0);
      } else if (runs) {
        this.commands.push(
          addNode("TextRun", this.#nextTempId("run"), {
            parent: tempId,
            text: child.value,
          }),
        );
      }
    }
  }

  /** A nested element's parent is the tree; a top-level one's `parent` may name a key created earlier in the batch. */
  #placement(element: XmlElementNode, parent: XmlParent | null): Record<string, string> {
    const written = element.props.parent;

    if (parent !== null && written !== undefined) {
      throw invalidXml(element, "A nested element gets its parent from the tree: drop the parent attribute.");
    }

    if (parent !== null) {
      return { parent: parent.id };
    }

    return written === undefined ? {} : { parent: this.keys[written] ?? this.#resolve(written) };
  }

  /** An element's attributes with `@key` references resolved, lists written item by item. */
  #attributes(element: XmlElementNode, omit: readonly string[] = []): Record<string, DslValue> {
    return Object.fromEntries(
      Object.entries(attributesOfElement(element, omit)).flatMap(([name, value]) => {
        const resolved = this.#resolve(value);

        return expandListAttribute(name, resolved) ?? [[name, resolved]];
      }),
    );
  }

  #resolve(value: string): string {
    return resolveKeyReferences(value, this.keys);
  }

  #noteVariable(element: XmlElementNode, tempId: string, attributes: Readonly<Record<string, DslValue>>): void {
    const key = ownProp(element, "key");
    const { name, scope } = attributes;

    if (DSL_VARIABLE_TYPE.test(element.type) && key !== null && typeof name === "string" && typeof scope === "string") {
      this.variables.push({
        key,
        tempId,
        name,
        scope,
      });
    }
  }

  #tempIdFor(element: XmlElementNode): string {
    const key = ownProp(element, "key");

    return key === null ? this.#nextTempId(tempIdBase(element.type)) : (this.keys[key] ?? this.#nextTempId(key));
  }
}

/** frame, richText, textBlock: readable temp ids in Framer's diagnostics. */
function tempIdBase(type: string): string {
  const base = type.replace(/Node$/, "");

  return `${base.charAt(0).toLowerCase()}${base.slice(1)}`;
}
