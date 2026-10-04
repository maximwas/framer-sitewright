import { UNSET_LOOKALIKES } from "../constants/history.ts";
import { XML_HIDDEN_META, XML_INDENT, XML_PLAIN_LINE, XML_TEXT_ATTRIBUTE_TYPES } from "../constants/xml.ts";
import { childrenOf, paramsOf } from "../history/dsl/serialized.ts";
import type { SerializedNode } from "../types/dsl.ts";
import type { XmlPrintPlace } from "../types/xml.ts";
import { positionalChildId } from "../utils/text-ids.ts";
import { escapeText } from "./xml-entities.ts";
import { flattenAttribute, formatAttributes, metaText } from "./xml-values.ts";

/**
 * A serialized node as XML: the tag is its type, attributes are its id, name, parameters, DSL attributes and `$`
 * metadata, and children nest. Rich text drops what its position implies: the ids of blocks and runs
 * (`v:<text id>:<n>`), and runs that only hold text become text. Unset attributes ("null", and values serialize()
 * also reports for "unset", UNSET_LOOKALIKES) are left out. design_apply reads the same format back.
 */
export function nodeToXml(node: SerializedNode): string {
  return linesOf(node, {
    parentId: null,
    index: 0,
    depth: 0,
  }).join("\n");
}

function linesOf(node: SerializedNode, place: XmlPrintPlace): string[] {
  const indent = XML_INDENT.repeat(place.depth);
  const children = childrenOf(node);
  const ownText = runText(node);
  const open = `${node.type}${formatAttributes(attributesOf(node, place, ownText !== null))}`;
  const texts = children.map((child, index) => plainRunText(child, node.id, index));
  const onlyText = children.length === 1 ? (texts[0] ?? null) : null;

  if (ownText !== null || onlyText !== null) {
    return [`${indent}<${open}>${inlineText(ownText ?? onlyText ?? "")}</${node.type}>`];
  }

  if (children.length === 0) {
    return [`${indent}<${open} />`];
  }

  const inner = children.flatMap((child, index) => {
    const text = texts[index] ?? null;

    if (text === null) {
      return linesOf(child, {
        parentId: node.id,
        index,
        depth: place.depth + 1,
      });
    }

    // A line of its own loses edge spaces, and two text lines in a row read back as one run: such text is a <TextRun>.
    const alone = (texts[index - 1] ?? null) === null && (texts[index + 1] ?? null) === null;

    return [
      `${indent}${XML_INDENT}${alone && XML_PLAIN_LINE.test(text) ? escapeText(text) : `<TextRun>${inlineText(text)}</TextRun>`}`,
    ];
  });

  return [`${indent}<${open}>`, ...inner, `${indent}</${node.type}>`];
}

/** `textAsChild`: a styled run shows its text between tags, `<TextRun bold="true">word</TextRun>`. */
function attributesOf(node: SerializedNode, place: XmlPrintPlace, textAsChild: boolean): [string, string][] {
  const lookalikes = UNSET_LOOKALIKES[node.type] ?? {};
  // "null" is how serialize() reports an unset attribute (right="null"): noise to read, nothing to write back.
  const attributes = Object.entries(node.attributes ?? {}).filter(
    ([key, value]) =>
      value !== undefined &&
      value !== null &&
      value !== "null" &&
      lookalikes[key] !== value &&
      !(textAsChild && key === "text"),
  );
  const variables = Array.isArray(node.variables) && node.variables.length > 0 ? [["variables", node.variables]] : [];

  return [
    ...(isPositional(node.id, place) ? [] : [["id", node.id] as [string, string]]),
    ...(node.name === undefined ? [] : [["name", node.name] as [string, string]]),
    ...Object.entries(paramsOf(node)).flatMap(([key, value]) => flattenAttribute(key, value)),
    ...attributes.flatMap(([key, value]) => flattenAttribute(key, value)),
    ...[...variables, ...metaOf(node, place)].map(([key, value]) => [String(key), metaText(value)] as [string, string]),
  ];
}

/** `$…` metadata. The parent shows in the tree, so `$parentId` stays only on the root. */
function metaOf(node: SerializedNode, place: XmlPrintPlace): [string, unknown][] {
  return Object.entries(node).filter(
    ([key, value]) =>
      key.startsWith("$") &&
      value !== undefined &&
      !XML_HIDDEN_META.has(key) &&
      (key !== "$parentId" || place.parentId === null),
  );
}

/** A block's or run's id that says only where it is, so the tree shows it already. */
function isPositional(id: string, { parentId, index }: XmlPrintPlace): boolean {
  return parentId !== null && id === positionalChildId(parentId, index);
}

/** The text of a run that has nothing else to say (no styles, a positional id), or null. */
function plainRunText(node: SerializedNode, parentId: string, index: number): string | null {
  const attributes = node.attributes ?? {};
  const keys = Object.keys(attributes).filter((key) => attributes[key] !== undefined);
  const text = runText(node);
  const place = {
    parentId,
    index,
    depth: 0,
  };

  return text !== null && keys.length === 1 && node.name === undefined && isPositional(node.id, place) ? text : null;
}

/**
 * A run's own text, when it has no children to print instead; also a rich text read through the Plugin API, which
 * holds its plain text whole rather than in blocks and runs.
 */
function runText(node: SerializedNode): string | null {
  const text = node.attributes?.text;

  return XML_TEXT_ATTRIBUTE_TYPES.has(node.type) && typeof text === "string" && childrenOf(node).length === 0
    ? text
    : null;
}

/**
 * Text on the line of its tags, where edge spaces survive reading back. Line breaks and tabs would be read as
 * indentation, and text of spaces only as nothing: those become character references.
 */
function inlineText(text: string): string {
  const escaped = escapeText(text).replaceAll("\n", "&#10;").replaceAll("\r", "&#13;").replaceAll("\t", "&#9;");

  return text.trim() === "" ? escaped.replaceAll(" ", "&#32;") : escaped;
}
