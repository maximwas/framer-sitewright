import type * as z from "zod";
import { SNAPSHOT_DEPTH } from "../constants/history.ts";
import { PLUGIN_CREATABLE_TYPES } from "../constants/plugin-nodes.ts";
import { XML_TEXT_ATTRIBUTE_TYPES } from "../constants/xml.ts";
import { OperationError } from "../errors.ts";
import type { DesignApplyResultSchema } from "../schemas/dsl.ts";
import type { DslIssue } from "../types/dsl.ts";
import type { FramerPort } from "../types/framer-port.ts";
import type { DslAttributeMap } from "../types/history.ts";
import type { OperationContext } from "../types/operations.ts";
import type { NodePlan, ParentRef, StyleLookup } from "../types/plugin-nodes.ts";
import type { XmlElementNode } from "../types/xml.ts";
import { errorMessage } from "../utils/errors.ts";
import { parseXml } from "../xml/parse-xml.ts";
import { attributesOfElement, ownProp } from "../xml/xml-attributes.ts";
import { invalidXml } from "../xml/xml-errors.ts";
import { textAttribute } from "../xml/xml-text.ts";
import { fromPluginNode, toPluginAttributes } from "./attributes.ts";
import { dslValueOf, layoutOf, nameOf, nodeRecord, setTextOf, textOf } from "./node-record.ts";
import { readPluginTree } from "./read.ts";
import { dslAttributes, snapshotsOf } from "./snapshots.ts";

type ApplyResult = z.input<typeof DesignApplyResultSchema>;

/**
 * design_apply without framer.agent (no Server API key): the XML through Plugin API calls. The whole batch is checked
 * first: an element type the Plugin API cannot create, or an attribute only the DSL has, refuses the batch before
 * anything changes. Then the calls run in tree order; a Framer error stops the batch, and what ran before it is
 * journaled. Undo steps use the DSL's attribute names, so either path can revert them.
 */
export async function applyXmlWithPluginApi(
  { runtime, history }: OperationContext,
  xml: string,
  pagePath: string,
): Promise<ApplyResult> {
  const port = runtime.port;
  const styles: StyleLookup = {
    colors: await port.getColorStyles(),
    texts: await port.getTextStyles(),
  };
  const planner = new Planner(styles);

  for (const root of parseXml(xml)) {
    if (root.kind === "text") {
      throw invalidXml(root, "Text must be inside a <RichTextNode>.");
    }

    planner.element(root, null);
  }

  if (planner.issues.length > 0) {
    return result(false, NEEDS_KEY_MESSAGE, planner.issues, {});
  }

  const runner = new Runner(port, styles, pagePath, history);

  for (const item of planner.plan) {
    try {
      await runner.run(item);
    } catch (error) {
      return result(
        false,
        `Stopped at <${item.element.type}> (line ${item.element.line}): ${errorMessage(error)}. What ran before it is in the journal.`,
        [
          {
            message: errorMessage(error),
            targets: [targetOf(item)],
          },
        ],
        runner.publicKeys(planner.keys),
      );
    }
  }

  return result(true, "Applied through the Plugin API.", [], runner.publicKeys(planner.keys));
}

const NEEDS_KEY_MESSAGE =
  "Nothing was changed. Without a Server API key, design_apply creates frames and plain text and sets the attributes the Plugin API has; the rest needs the DSL, which comes with the project's Server API key (journal page Settings, or `npx sitewright key`).";

/** Walks the XML into calls, collecting everything the Plugin API cannot do instead of throwing at the first. */
class Planner {
  readonly plan: NodePlan[] = [];
  readonly issues: DslIssue[] = [];
  /** Every new element's reference: its `key`, or an internal one for elements without. */
  readonly keys = new Map<string, string | null>();
  readonly #styles: StyleLookup;
  #sequence = 0;

  constructor(styles: StyleLookup) {
    this.#styles = styles;
  }

  element(element: XmlElementNode, parent: { readonly ref: ParentRef; readonly isNew: boolean } | null): void {
    const id = ownProp(element, "id");

    if (element.props.$delete !== undefined) {
      const onlyDelete = Object.keys(element.props).every((key) => key === "id" || key === "$delete");

      if (id === null || element.props.$delete !== "true" || !onlyDelete || element.children.length > 0) {
        throw invalidXml(element, `$delete takes an id and nothing else: <${element.type} id="…" $delete="true" />.`);
      }

      this.plan.push({
        kind: "delete",
        element,
        id,
      });

      return;
    }

    if (id === null) {
      this.#create(element, parent);
    } else {
      this.#update(element, id, parent);
    }
  }

  #create(element: XmlElementNode, parent: { readonly ref: ParentRef; readonly isNew: boolean } | null): void {
    const key = ownProp(element, "key");
    const ref = `#${++this.#sequence}`;
    const attributes = attributesOfElement(element, ["parent", "index"]);
    const text = XML_TEXT_ATTRIBUTE_TYPES.has(element.type) ? textAttribute(element) : null;
    const placement = this.#placement(element, parent);
    const index = element.props.index === undefined ? null : Number(element.props.index);

    this.keys.set(ref, key);

    if (!PLUGIN_CREATABLE_TYPES.has(element.type)) {
      this.#issue(element, key ?? element.type, `<${element.type}> can be created only with a Server API key.`);
    }

    if (placement === null) {
      this.#issue(element, key ?? element.type, `A new <${element.type}> needs parent="<id or @key>".`);
    }

    if (index !== null && !Number.isInteger(index)) {
      this.#issue(element, key ?? element.type, `index="${element.props.index}" must be a whole number.`);
    }

    this.#check(element, element.type, attributes, key ?? element.type);
    this.plan.push({
      kind: "create",
      element,
      type: element.type,
      ref,
      parent: placement ?? { id: "" },
      index,
      attributes,
      text,
    });
    this.#children(element, { ref }, true);
  }

  #update(element: XmlElementNode, id: string, parent: { readonly isNew: boolean } | null): void {
    if (parent?.isNew) {
      throw invalidXml(element, `Node ${id} exists, so it cannot go inside a new element.`);
    }

    const attributes = attributesOfElement(element);
    const text = XML_TEXT_ATTRIBUTE_TYPES.has(element.type) ? textAttribute(element) : null;

    this.#check(element, element.type, attributes, id);
    this.plan.push({
      kind: "update",
      element,
      id,
      attributes,
      text,
    });
    this.#children(element, { id }, false);
  }

  #children(element: XmlElementNode, ref: ParentRef, isNew: boolean): void {
    for (const child of element.children) {
      if (child.kind !== "element") {
        continue;
      }

      if (element.type === "RichTextNode") {
        this.#issue(child, child.type, `<${child.type}> blocks and runs need a Server API key: put plain text inside.`);
      } else {
        this.element(child, {
          ref,
          isNew,
        });
      }
    }
  }

  /** Where a new element goes: its enclosing element, or for a top-level one its `parent` (an id or @key). */
  #placement(element: XmlElementNode, parent: { readonly ref: ParentRef } | null): ParentRef | null {
    const written = element.props.parent;

    if (parent !== null) {
      if (written !== undefined) {
        throw invalidXml(element, "A nested element gets its parent from the tree: drop the parent attribute.");
      }

      return parent.ref;
    }

    if (written === undefined) {
      return null;
    }

    return written.startsWith("@") ? { key: written.slice(1) } : { id: written };
  }

  #check(element: XmlElementNode, type: string, attributes: Record<string, string>, target: string): void {
    const { unsupported, invalid } = toPluginAttributes(type, withoutKeyReferences(attributes), this.#styles);

    if (unsupported.length > 0) {
      this.#issue(element, target, `${unsupported.join(", ")} on <${type}> need a Server API key.`);
    }

    for (const reason of invalid) {
      this.#issue(element, target, reason);
    }
  }

  #issue(element: { readonly line: number }, target: string, message: string): void {
    this.issues.push({
      message: `line ${element.line}: ${message}`,
      targets: [target],
    });
  }
}

/** Runs the planned calls in order and records undo steps. */
class Runner {
  readonly #port: FramerPort;
  readonly #styles: StyleLookup;
  readonly #pagePath: string;
  readonly #history: OperationContext["history"];
  /** Created nodes by their reference (key or internal). */
  readonly #created = new Map<string, string>();

  constructor(port: FramerPort, styles: StyleLookup, pagePath: string, history: OperationContext["history"]) {
    this.#port = port;
    this.#styles = styles;
    this.#pagePath = pagePath;
    this.#history = history;
  }

  async run(item: NodePlan): Promise<void> {
    switch (item.kind) {
      case "create":
        return this.#create(item);
      case "update":
        return this.#update(item);
      case "delete":
        return this.#delete(item);
    }
  }

  /** key → real id, for every key the batch created. */
  publicKeys(refs: ReadonlyMap<string, string | null>): Record<string, string> {
    return Object.fromEntries(
      [...refs].flatMap(([ref, key]) => {
        const id = this.#created.get(ref);

        return key === null || id === undefined ? [] : [[key, id] as const];
      }),
    );
  }

  async #create(item: Extract<NodePlan, { kind: "create" }>): Promise<void> {
    const parentId = this.#parentId(item.parent);
    const attributes = this.#resolve(item.attributes);
    const converted = toPluginAttributes(item.type, attributes, this.#styles);
    // A frame the DSL creates has no fill; the Plugin API's would be white.
    const created = nodeRecord(
      item.type === "FrameNode"
        ? await this.#port.createFrameNode(
            {
              backgroundColor: null,
              ...converted.attributes,
            },
            parentId,
          )
        : await this.#createText(converted.attributes, parentId),
    );

    if (created === null) {
      throw new OperationError("WRITE_FAILED", `Framer did not create the <${item.type}>.`);
    }

    const id = String(created.id);

    this.#created.set(item.ref, id);

    const key = item.element.props.key;

    if (key !== undefined) {
      this.#created.set(key, id);
    }

    if (item.text !== null) {
      await setTextOf(created, item.text);
    }

    if (item.index !== null) {
      await this.#port.setParent(id, parentId, item.index);
    }

    this.#history?.record({
      kind: "node",
      id,
      type: item.type,
      name: attributes.name ?? null,
      pagePath: this.#pagePath,
      change: "created",
      before: null,
      after: {
        parentId,
        index: item.index,
        attributes:
          item.text === null
            ? attributes
            : {
                ...attributes,
                text: item.text,
              },
        nodes: [],
        overrides: {},
      },
    });
  }

  async #update(item: Extract<NodePlan, { kind: "update" }>): Promise<void> {
    const node = nodeRecord(await this.#port.getNode(item.id));

    if (node === null) {
      throw new OperationError("NOT_FOUND", `Node ${item.id} was not found.`, "Read the page with nodes_read for ids.");
    }

    const parent = nodeRecord(await this.#port.getParent(item.id));
    const current = fromPluginNode(node, layoutOf(parent));
    const attributes = this.#resolve(item.attributes);
    const converted = toPluginAttributes(current.type, attributes, this.#styles);

    if (converted.unsupported.length > 0 || converted.invalid.length > 0) {
      throw new OperationError(
        "INVALID_INPUT",
        `Node ${item.id} is a ${current.type}: ${[...converted.unsupported, ...converted.invalid].join(", ")} cannot be set on it through the Plugin API.`,
      );
    }

    const before: DslAttributeMap = Object.fromEntries(
      Object.keys(attributes).map((name) => [name, dslValueOf(node, current.attributes, name)]),
    );
    const after: DslAttributeMap = { ...attributes };

    if (item.text !== null) {
      before.text = await textOf(node);
      after.text = item.text;
    }

    if (Object.keys(converted.attributes).length > 0) {
      await this.#port.setAttributes(item.id, converted.attributes);
    }

    if (item.text !== null && !(await setTextOf(node, item.text))) {
      throw new OperationError("INVALID_INPUT", `Node ${item.id} is a ${current.type}: it holds no text.`);
    }

    const parentId = parent === null ? null : String(parent.id);

    this.#history?.record({
      kind: "node",
      id: item.id,
      type: current.type,
      name: nameOf(node),
      pagePath: this.#pagePath,
      change: "updated",
      before: state(parentId, null, before),
      after: state(parentId, null, after),
    });
  }

  async #delete(item: Extract<NodePlan, { kind: "delete" }>): Promise<void> {
    const tree = await readPluginTree(this.#port, item.id, SNAPSHOT_DEPTH);

    if (tree === null) {
      throw new OperationError("NOT_FOUND", `Node ${item.id} was not found.`, "Read the page with nodes_read for ids.");
    }

    const parentId = tree.$parentId ?? null;
    const siblings = parentId === null ? [] : await this.#port.getChildren(parentId);
    const index = siblings.findIndex((sibling) => sibling.id === item.id);
    const nodes = snapshotsOf(tree, parentId ?? "", Math.max(index, 0));

    if (nodes.some((node) => !PLUGIN_CREATABLE_TYPES.has(node.type))) {
      this.#history?.markIncomplete(
        `Deleting ${item.id} removed nodes the Plugin API cannot recreate (only frames and text): undo brings back the rest.`,
      );
    }

    await this.#port.removeNodes([item.id]);
    this.#history?.record({
      kind: "node",
      id: item.id,
      type: tree.type,
      name: tree.name ?? null,
      pagePath: this.#pagePath,
      change: "deleted",
      before: {
        ...state(parentId, index === -1 ? null : index, dslAttributes(tree.attributes)),
        nodes,
      },
      after: null,
    });
  }

  async #createText(attributes: Record<string, unknown>, parentId: string): Promise<unknown> {
    if (this.#port.createTextNode === undefined) {
      throw new OperationError("UNSUPPORTED_TRANSPORT", "This Framer runtime cannot create text nodes.");
    }

    return this.#port.createTextNode(attributes, parentId);
  }

  #parentId(parent: ParentRef): string {
    if ("id" in parent) {
      return parent.id;
    }

    const name = "key" in parent ? parent.key : parent.ref;
    const id = this.#created.get(name);

    if (id === undefined) {
      throw new OperationError("INVALID_INPUT", `@${name} is not a key created earlier in this batch.`);
    }

    return id;
  }

  /** `@key` in values → the id the batch created for it. */
  #resolve(attributes: Readonly<Record<string, string>>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(attributes).map(([name, value]) => [
        name,
        value.replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (reference, key: string) => this.#created.get(key) ?? reference),
      ]),
    );
  }
}

function result(ok: boolean, message: string, errors: DslIssue[], keys: Record<string, string>): ApplyResult {
  return {
    ok,
    message,
    errors,
    warnings: [],
    lint: [],
    renamedIds: {},
    keys,
  };
}

function targetOf(item: NodePlan): string {
  return item.kind === "create" ? (item.element.props.key ?? item.type) : item.id;
}

function withoutKeyReferences(attributes: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(Object.entries(attributes).map(([name, value]) => [name, value.replace(/@\w+/g, "ref")]));
}

function state(parentId: string | null, index: number | null, attributes: DslAttributeMap) {
  return {
    parentId,
    index,
    attributes,
    nodes: [],
    overrides: {},
  };
}
