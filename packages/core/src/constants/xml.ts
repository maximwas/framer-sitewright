/** A tag or attribute name: node types, DSL attributes with dotted paths, and `$` names (`$control__title`). */
export const XML_NAME = /[A-Za-z_$][\w$.:-]*/y;

/** A `key`: a name for a new element in the answer, and the base of its temp id. */
export const XML_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** `@key` inside a value: the element of this batch with that key (`scope="@button"`, `var(--variable-@label)`). */
export const XML_KEY_REFERENCE = /@([A-Za-z_][A-Za-z0-9_]*)/g;

/** An entity reference: `&amp;`, `&#233;`, `&#xE9;`. A `&` that starts none of these is an error. */
export const XML_ENTITY = /&(?:#x([0-9A-Fa-f]+)|#(\d+)|([A-Za-z]+));/y;

/** XML's own named entities; HTML's (`&nbsp;`) are not XML. */
export const XML_NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** Markup the reader skips: comments, processing instructions (`<?xml …?>`). */
export const XML_SKIPPED = [
  ["<!--", "-->"],
  ["<?", "?>"],
] as const;

export const XML_CDATA_OPEN = "<![CDATA[";

export const XML_CDATA_CLOSE = "]]>";

/** Text printed on a line of its own: edge spaces would be trimmed away as indentation, so such text is a <TextRun>. */
export const XML_PLAIN_LINE = /^\S(?:.*\S)?$/;

export const XML_INDENT = "  ";

/** serialize() metadata that only repeats what the tree shows: the page and the scope of every node. */
export const XML_HIDDEN_META: ReadonlySet<string> = new Set(["$groundNodeId", "$scopeId"]);

/** Props the writer reads itself: an existing node's `id`, a new node's `key`, and `$delete`. */
export const XML_ELEMENT_KEYS: ReadonlySet<string> = new Set(["id", "key", "$delete"]);

/**
 * Props that describe a node rather than set it: they come from reading and are ignored when writing, so a read tree
 * can be edited and sent back.
 */
export const XML_READ_ONLY_PROPS: ReadonlySet<string> = new Set([
  "$rect",
  "$parentId",
  "$groundNodeId",
  "$scopeId",
  "$isPrimary",
  "$isReplica",
  "$originalId",
  "$gesture",
  "$inheritsFrom",
  "$breakpoints",
  "$truncated",
  "$descendantCount",
  "variables",
]);

/** Nodes whose `text` attribute is their plain text content, so text inside them sets it. */
export const XML_TEXT_ATTRIBUTE_TYPES: ReadonlySet<string> = new Set(["RichTextNode", "TextRun"]);

/** Nodes whose text children become runs of their own. */
export const XML_RUN_CONTAINER_TYPES: ReadonlySet<string> = new Set(["TextBlock"]);
