import { parseSerializedNode } from "../history/dsl/serialized.ts";
import type { SerializedNode } from "../types/dsl.ts";
import { cssDeclarations, tokenVariables } from "./css.ts";
import type { ExportContext, ExportElement, StackDirection } from "./types.ts";

const TEXT_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "blockquote", "li"]);
const INDENT = "  ";

function childrenOf(node: SerializedNode): SerializedNode[] {
  return (node.children ?? []).flatMap((child) => {
    const parsed = parseSerializedNode(child);

    return parsed === null ? [] : [parsed];
  });
}

/** A layer's class: its name in kebab case, or its id, unique in the export. */
function classNameFor(node: SerializedNode, used: Map<string, number>): string {
  const base = (node.name ?? node.id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^(\d)/, "n-$1");
  const name = base === "" ? "layer" : base;
  const count = used.get(name) ?? 0;

  used.set(name, count + 1);

  return count === 0 ? name : `${name}-${count + 1}`;
}

/** A rich text's text: its runs joined, blocks on their own lines. */
function textOf(node: SerializedNode): string {
  const own = node.attributes?.["text"];

  if (typeof own === "string") {
    return own;
  }

  return childrenOf(node)
    .map(textOf)
    .join(node.type === "RichTextNode" ? "\n" : "");
}

function elementOf(
  node: SerializedNode,
  parentDirection: StackDirection,
  context: ExportContext,
  used: Map<string, number>,
): ExportElement {
  const attributes = node.attributes ?? {};
  const direction: StackDirection =
    attributes["layout"] === "stack" ? (attributes["stackDirection"] === "horizontal" ? "row" : "column") : null;
  const declarations = cssDeclarations(attributes, parentDirection, context);
  const link = typeof attributes["link"] === "string" ? attributes["link"] : null;
  const htmlTag = typeof attributes["htmlTag"] === "string" ? attributes["htmlTag"] : null;
  const className = classNameFor(node, used);

  if (node.type === "RichTextNode") {
    const blocks = childrenOf(node).filter(({ type }) => type === "TextBlock");
    const firstTag = blocks[0]?.attributes?.["tag"];

    // One block: the text takes the block's tag itself. Several: a wrapper holds a tag per block.
    if (blocks.length <= 1) {
      return {
        tag: typeof firstTag === "string" && TEXT_TAGS.has(firstTag) ? firstTag : "p",
        className,
        declarations,
        attributes: {},
        text: textOf(node),
        children: [],
      };
    }

    return {
      tag: "div",
      className,
      declarations,
      attributes: {},
      text: null,
      children: blocks.map((block) => {
        const tag = block.attributes?.["tag"];

        return {
          tag: typeof tag === "string" && TEXT_TAGS.has(tag) ? tag : "p",
          className: classNameFor(block, used),
          declarations: [],
          attributes: {},
          text: textOf(block),
          children: [],
        };
      }),
    };
  }

  return {
    tag: link === null ? (htmlTag ?? "div") : "a",
    className,
    declarations,
    attributes: {
      ...(link === null ? {} : { href: link }),
      ...(node.type === "ComponentInstanceNode" ? { "data-component": node.name ?? node.id } : {}),
    },
    text: null,
    children: childrenOf(node).map((child) => elementOf(child, direction, context, used)),
  };
}

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function htmlOf(element: ExportElement, depth: number): string {
  const pad = INDENT.repeat(depth);
  const attributes = [
    `class="${element.className}"`,
    ...Object.entries(element.attributes).map(([name, value]) => `${name}="${escapeHtml(value)}"`),
  ].join(" ");

  if (element.text !== null) {
    return `${pad}<${element.tag} ${attributes}>${escapeHtml(element.text).replaceAll("\n", "<br>")}</${element.tag}>`;
  }

  if (element.children.length === 0) {
    return `${pad}<${element.tag} ${attributes}></${element.tag}>`;
  }

  return [
    `${pad}<${element.tag} ${attributes}>`,
    ...element.children.map((child) => htmlOf(child, depth + 1)),
    `${pad}</${element.tag}>`,
  ].join("\n");
}

function cssOf(element: ExportElement): string[] {
  const own =
    element.declarations.length === 0
      ? []
      : [
          `.${element.className} {\n${element.declarations.map(([name, value]) => `${INDENT}${name}: ${value};`).join("\n")}\n}`,
        ];

  return [...own, ...element.children.flatMap(cssOf)];
}

/** A layer and everything in it as HTML, with a stylesheet: one class per layer, tokens as CSS variables. */
export function exportHtml(tree: SerializedNode, context: ExportContext): { html: string; css: string } {
  const root = elementOf(tree, null, context, new Map());

  return {
    html: htmlOf(root, 0),
    css: [tokenVariables(context), ...cssOf(root)].join("\n\n"),
  };
}

function camelCase(property: string): string {
  return property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function styleObject(declarations: ExportElement["declarations"]): string {
  if (declarations.length === 0) {
    return "";
  }

  const entries = declarations.map(([name, value]) => {
    const number = Number(value);

    return `${camelCase(name)}: ${value !== "" && Number.isFinite(number) && !name.includes("color") ? value : JSON.stringify(value)}`;
  });

  return ` style={{ ${entries.join(", ")} }}`;
}

function jsxOf(element: ExportElement, depth: number): string {
  const pad = INDENT.repeat(depth);
  const attributes = Object.entries(element.attributes)
    .map(([name, value]) => ` ${name}=${JSON.stringify(value)}`)
    .join("");
  const open = `<${element.tag}${attributes}${styleObject(element.declarations)}`;

  if (element.text !== null) {
    return `${pad}${open}>{${JSON.stringify(element.text)}}</${element.tag}>`;
  }

  if (element.children.length === 0) {
    return `${pad}${open} />`;
  }

  return [
    `${pad}${open}>`,
    ...element.children.map((child) => jsxOf(child, depth + 1)),
    `${pad}</${element.tag}>`,
  ].join("\n");
}

/** A layer and everything in it as one React component with inline styles; tokens stay CSS variables. */
export function exportReact(tree: SerializedNode, context: ExportContext, componentName: string): string {
  const root = elementOf(tree, null, context, new Map());

  return [
    "// Exported from Framer by Sitewright. Colors are CSS variables: define them with the tokens below.",
    `/*\n${tokenVariables(context)}\n*/`,
    "",
    `export default function ${componentName}() {`,
    `${INDENT}return (`,
    jsxOf(root, 2),
    `${INDENT});`,
    "}",
    "",
  ].join("\n");
}
