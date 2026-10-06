/** How the activity log names each operation; unknown ones show their own name. */
export const OPERATION_LABELS: Readonly<Record<string, string>> = {
  "colorTokens.upsert": "Color tokens",
  "colorTokens.delete": "Color tokens",
  "colorTokens.list": "List color tokens",
  "textStyles.upsert": "Text styles",
  "textStyles.delete": "Text styles",
  "textStyles.list": "List text styles",
  "fonts.search": "Font search",
  "project.overview": "Project overview",
  "project.info": "Project info",
  "project.capabilities": "Plan check",
  "project.editorUrl": "Editor link",
  "project.publish": "Publish",
  "nodes.read": "Read nodes",
  "selection.get": "Editor selection",
  "design.apply": "Design",
  "layout.audit": "Layout audit",
  "breakpoints.add": "Breakpoints",
  "files.upload": "Upload file",
  "history.revert": "Revert",
  "images.search": "Photo search",
  "images.upload": "Image upload",
  "svg.add": "SVG layer",
  "icons.search": "Icon search",
  "components.read": "Read components",
  "components.setControls": "Component controls",
  "components.insert": "Component inserted",
  "components.makeLocal": "Component made local",
  "components.detach": "Instance detached",
  "components.insertSection": "Section inserted",
  "customCode.get": "Read custom code",
  "customCode.set": "Custom code",
  "codeFiles.list": "List code files",
  "codeFiles.read": "Read code file",
  "codeFiles.write": "Code file",
  "codeFiles.delete": "Delete code file",
  "cms.collections.list": "CMS collections",
  "cms.collections.create": "CMS collection",
  "cms.collections.delete": "Delete CMS collection",
  "cms.fields.set": "CMS fields",
  "cms.items.list": "CMS items",
  "cms.items.upsert": "CMS items",
  "cms.items.delete": "Delete CMS items",
  "cms.items.order": "Order CMS items",
  "localization.locales": "Locales",
  "localization.get": "Read translations",
  "localization.set": "Translations",
  "pages.create": "New page",
  "pages.delete": "Delete page",
  "nodes.find": "Find layers",
  "text.replace": "Replace text",
  "redirects.list": "Redirects",
  "redirects.set": "Redirects",
  "project.publishStatus": "Publish status",
  "project.deployments": "Deployments",
};

/**
 * What a journal list shows: every entry; the changes (writes, reverts, checkpoints) with the skills the AI used for
 * them; only the CMS work (collections, fields, items and their undos); only what the AI read; only the skills.
 */
export const ACTIVITY_VIEWS = ["all", "changes", "cms", "reads", "skills"] as const;

/** At most this many nodes and images in an entry's detail; a long list says how many more there were. */
export const DETAIL_MAX_NODES = 20;
export const DETAIL_MAX_IMAGES = 12;

/** An entry's subject and summary are cut to this many characters. */
export const DETAIL_MAX_TEXT = 160;

/**
 * Where the panel's image previews may come from: uploads and fills on Framer's CDN, photos images_search finds. The
 * web journal's CSP lets images in from these origins only, so no other URL is kept for a preview.
 */
export const PREVIEW_IMAGE_ORIGINS: readonly string[] = [
  "https://framerusercontent.com",
  "https://images.unsplash.com",
];

/** A preview image's URL inside free text, e.g. the fills of a design_apply batch. */
export const PREVIEW_IMAGE_URL = new RegExp(
  `(?:${PREVIEW_IMAGE_ORIGINS.map((origin) => origin.replaceAll(".", "\\.")).join("|")})/[^\\s"'<>)]+`,
  "g",
);

/**
 * How a call reached Framer, for the journal's badge: the Plugin API inside the open editor, the Server API's regular
 * methods, or the Server API's framer.agent (the DSL), Framer's own agent layer.
 */
export const ACTIVITY_LAYERS = ["plugin-api", "server-api", "framer-agent"] as const;

/** Who asked for an entry: the AI through an MCP tool, or the user in the journal window. */
export const ACTIVITY_ACTORS = ["ai", "user"] as const;

/** What an undo step is about: a color token, a text style, or a canvas node changed through the DSL. */
export const UNDO_STEP_KINDS = ["color-style", "text-style", "node", "cms-item"] as const;

/** How a DSL command changed a canvas node. */
export const NODE_CHANGES = ["created", "updated", "moved", "deleted"] as const;

/** Top-level keys of a serialized node that are not creation parameters of `+Type`. */
export const SERIALIZED_STRUCTURE_KEYS: ReadonlySet<string> = new Set([
  "type",
  "id",
  "name",
  "attributes",
  "children",
  "variables",
]);

/**
 * Attribute values serialize() reports alike whether they are set or not. A rich text's alignment left unset follows
 * its text style, yet reads "start" just like an explicit "start" (spike 11, 30.09.2026). Such a value is recorded as
 * null, which the DSL takes as "unset", so a recreated or restored node follows its style again instead of pinning
 * "start" over it. The price: an explicit "start" over a style aligned otherwise comes back as the style's alignment.
 */
export const UNSET_LOOKALIKES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  RichTextNode: { textAlignment: "start" },
};

/** Attributes Framer takes but never reports back through serialize(), so no undo step can hold them (30.09.2026). */
export const UNREADABLE_ATTRIBUTES: ReadonlySet<string> = new Set(["appearEffect.replay", "textEffect.replay"]);

/** Node types inside a rich text: a change to one of them is a change to the rich text's content. */
export const TEXT_CONTENT_TYPES: ReadonlySet<string> = new Set([
  "TextBlock",
  "TextRun",
  "TextBlockquote",
  "TextTable",
  "TextTableRow",
  "TextTableCell",
  "TextBulletList",
  "TextNumberedList",
  "TextListItem",
  "TextMediaBlock",
  "TextComponentInstance",
  "TextLineBreak",
  "TextUnsupportedBlock",
]);

/**
 * The most steps one revert takes. Only a sanity bound: steps come from the journal, never from the model, and a
 * restore after a big page build can span thousands of nodes.
 */
export const REVERT_MAX_STEPS = 20_000;

/** A token reference inside a DSL value, e.g. `fill="var(--token-ab12cd34e)"`; the group is the token id. */
export const TOKEN_REFERENCE = /var\(--token-([\w-]+)\)/g;

/** A virtual id of a rich text's block or run: `v:<rich text id>:<position>…`. */
export const VIRTUAL_TEXT_ID = /^v:([^:]+):/;

/** How deep a deleted node is snapshotted; a deeper subtree is marked incomplete. */
export const SNAPSHOT_DEPTH = 50;

/** Enough levels for a rich text's blocks, lists, items and runs. */
export const TEXT_CONTENT_DEPTH = 8;

/**
 * What undoing one step did. `unchanged`: the item already was as before; `gone`: it no longer exists, so there was
 * nothing to undo; `conflict`: someone changed it after the AI did, so it was left alone.
 */
export const REVERT_OUTCOMES = ["deleted", "restored", "recreated", "unchanged", "gone", "conflict"] as const;

/** What kind of change an entry made, for the panel: each gets its own badge. */
export const CHANGE_CATEGORIES = [
  "components",
  "animations",
  "text",
  "colors",
  "layout",
  "settings",
  "styles",
  "content",
] as const;

/** Attribute roots that animate: effects and transitions. */
export const ANIMATION_ATTRIBUTES: ReadonlySet<string> = new Set([
  "appearEffect",
  "hoverEffect",
  "tapEffect",
  "loopEffect",
  "textEffect",
  "tickerEffect",
  "parallaxEffect",
  "styleTransformEffect",
  "scrollVariantEffect",
  "dragEffect",
  "flowEffect",
  "pageEffects",
  "transition",
]);

/** Attribute roots that color something. */
export const COLOR_ATTRIBUTES: ReadonlySet<string> = new Set([
  "fill",
  "textColor",
  "border",
  "borderColor",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "boxShadows",
  "shadows",
  "textStrokeColor",
  "textBackgroundColor",
  "$control__color",
  "$control__fill",
]);

/** Attribute roots of text and type. */
export const TEXT_ATTRIBUTES: ReadonlySet<string> = new Set([
  "text",
  "tag",
  "textStylePreset",
  "fontName",
  "fontWeight",
  "fontStyle",
  "fontSize",
  "lineHeight",
  "letterSpacing",
  "textAlignment",
  "textTransform",
  "textDecoration",
  "textWrap",
  "textTruncation",
]);

/** Attribute roots of size, stacking, spacing and position. */
export const LAYOUT_ATTRIBUTES: ReadonlySet<string> = new Set([
  "layout",
  "stackDirection",
  "stackDistribution",
  "stackAlignment",
  "stackWrapEnabled",
  "gap",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "aspectRatio",
  "position",
  "positionStickyTop",
  "top",
  "right",
  "bottom",
  "left",
  "zIndex",
  "overflow",
  "radius",
  "rotation",
  "gridColumnCount",
  "gridRowCount",
  "gridColumnMinWidth",
  "gridColumnWidth",
  "gridRowHeightType",
  "gridRowHeight",
  "visible",
]);

/** Node types that are a component, a variant or an instance of one. */
export const COMPONENT_NODE_TYPES: ReadonlySet<string> = new Set([
  "ComponentNode",
  "ComponentInstanceNode",
  "TextComponentInstance",
]);

/** Readable names for nodes without one, by type. */
export const NODE_TYPE_LABELS: Readonly<Record<string, string>> = {
  FrameNode: "Frame",
  RichTextNode: "Text",
  ComponentNode: "Component",
  ComponentInstanceNode: "Instance",
  IconNode: "Icon",
  SVGNode: "Vector",
  WebPageNode: "Page",
  TextBlock: "Paragraph",
  TextRun: "Text run",
};
