import { PRODUCT } from "@sitewright/core";
import { ErrorCode } from "framer-api";

/** What to do about a Framer Server API error, appended to its message. */
export const ERROR_HINTS: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.UNAUTHORIZED]:
    "The Server API key does not open this project: add it again from the project's Site Settings → General → API Keys (journal page Settings, or `npx sitewright key`).",
  [ErrorCode.INVALID_REQUEST]: "Check the tool arguments.",
  [ErrorCode.PROJECT_CLOSED]: "The Framer session closed; retry the call.",
  [ErrorCode.POOL_EXHAUSTED]: "Framer has no free headless editor right now; retry in a minute.",
  [ErrorCode.TOKEN_SESSION_LIMIT]: "Too many Server API sessions for this key; close other clients and retry.",
  [ErrorCode.TIMEOUT]: "Framer did not answer in time; the change may still have applied, so re-read before retrying.",
  [ErrorCode.NODE_NOT_FOUND]: "Re-read the page with nodes_read to get current ids.",
  [ErrorCode.SCREENSHOT_TOO_LARGE]: "Screenshot a smaller node or use scale 1.",
};

/**
 * The MCP `instructions`: only where to start and which tool to reach for. Claude Code keeps the first 2,048
 * characters of them, so everything else lives in design_guide (dsl: what Framer does without saying so) and in the
 * tools' own descriptions.
 */
export const SERVER_INSTRUCTIONS = [
  `${PRODUCT.title} edits the Framer project open in its plugin; nothing runs until the user opens the ${PRODUCT.title} plugin and clicks Connect. Start with project_overview; framer_status shows the connection, whether the project has a Server API key, and plan limits. For another project call framer_connect { project } first; for "this" or "the selected" call selection_get.`,
  "On a new site or a redesign call project_brief first: ask its open questions in short rounds and save the answers. Before building or restyling, read design_guide workflow, then the topic for the task; before the first design_apply of a session read design_guide dsl: it holds what Framer does without saying so.",
  "Write pages with nodes_read (XML) and design_apply xml. Framer applies every command of a batch it can: fix what errors name and send only those commands again. Fix every audit defect before the next section.",
  "Without a Server API key design_apply makes frames and plain text only, and photos, icons, the component catalog, screenshots and the DSL reference are unavailable.",
  "Before calling a page done: layout_audit and node_screenshot of every breakpoint. Before handover: seo_audit, links_check, images_check and a11y_audit.",
  "Call activity_checkpoint when a new user task starts; activity_undo and activity_restore take changes back, and userChanges in a result lists what the user undid since your last call: re-read before building on it.",
  "Publish (project_publish) and write code (custom_code_set, code_file_write) only when the user asks.",
  "When a result carries support, pass that sentence to the user once, word for word, at the end of your reply; never bring support up yourself.",
].join(" ");

/** design_apply: XML first, since nesting shows the structure and nodes_read prints the same format. */
export const DESIGN_APPLY_DESCRIPTION = [
  "Changes a page and returns Framer's diagnostics (errors, warnings, lint, renamedIds). Prefer xml; dsl (raw +Node/SET/DEL/MOVE/DUPE commands) runs after it, for moves and duplicates.",
  "Without a Server API key it runs through the Plugin API: xml only, frames and plain text with layout, size, position, fill, radius, border, link and textStylePreset (design_guide dsl lists them), and overrides on breakpoint copies by compound id; anything else refuses the whole batch before a change.",
  'XML: tags are node types, attributes are DSL attributes (framer_docs), every value in quotes. An element without id is created: nested ones under their parent element, a top-level one under parent="<id>", at the end unless index="<n>" is given; key="hero" returns its real id in keys, and @hero in any value (scope, component, parent, var(--variable-@label), and the dsl part) points at it within the batch.',
  'An element with id gets a SET of only the attributes it lists; $delete="true" deletes it. Nesting existing nodes only addresses them: nothing moves and omitted children stay.',
  "Inside an existing rich text, blocks and runs without id are the ones at that position (as nodes_read prints them); give a new one a key.",
  'Text: plain text inside a RichTextNode, or <TextBlock tag="h1">…</TextBlock> blocks with <TextRun bold="true">…</TextRun> runs; write & and < as &amp; and &lt;. Nested attributes are dotted: hoverEffect.scale="1".',
  'With a key, color text with a token on the RichTextNode itself, textColor="var(--token-<id>)", not only through its text style: only then does the token show in Framer\'s Color field. Framer applies every command it can and skips the failed ones: send only the failed commands again, fixed, never the whole batch (it would create its nodes twice). Pass pagePath for a node that is not on the home page (nodes_find and selection_get give it). Read design_guide dsl before the first batch.',
].join(" ");

/**
 * The rule for the code tools: the canvas comes first, code only on request or when nothing else
 * works, and the user hears about it before any code is written.
 */
export const CODE_TOOLS_RULE =
  "Use only when the user explicitly asks for custom code or a code component, or when the canvas (design_apply: components, variants, effects, interactions) cannot do what they asked. In that case tell the user why code is needed before writing it. Never choose code on your own for something the canvas can build.";

/** How CMS values are written and read, shared by the CMS item tools. */
export const CMS_VALUES_RULE =
  'Values: text and formattedText as strings (markdown or HTML), numbers, true/false, dates as ISO strings, link, file and color as strings, an image as its URL or { "url", "alt" }, an enum by its case name, a reference by the referenced item\'s slug (a list of slugs for multi-references); null clears a value.';

/** CMS writes have no undo yet: the journal marks them, and the agent must know before it acts. */
export const CMS_UNDO_RULE =
  "Undo does not restore CMS collections, fields or the order of items yet: the journal cannot take this back.";

/** Why a code tool refused: its switch on the journal page is off, and only the user turns it on. */
export const CODE_SWITCH_OFF: Readonly<Record<"customCode" | "codeComponents", string>> = {
  customCode: `Custom code is switched off in the ${PRODUCT.title} journal page (Settings → Custom code).`,
  codeComponents: `Code components are switched off in the ${PRODUCT.title} journal page (Settings → Code components).`,
};

export const CODE_SWITCH_HINT =
  "Do not work around it. Tell the user what needs code and why; they can switch it on in the Settings of the journal page (activity_open gives its link).";

/** Appended to a tool error that Framer raised because the project's plan lacks the feature. */
export const PLAN_LIMIT_HINT =
  "Plan limit: the project's Framer plan does not include this. Tell the user it needs a higher plan instead of retrying; framer_status lists every limit found so far.";

/** The eight bytes every PNG file starts with. */
export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** "IHDR" as a chunk type: always the first chunk, it holds the image size. */
export const PNG_IHDR_CHUNK = 0x49484452;

/** Annotations of a tool that only reads the activity journal. */
export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

/** Annotations of activity_open: it starts a local page and issues a link, Framer is not touched. */
export const OPEN_ANNOTATIONS = {
  readOnlyHint: true,
  idempotentHint: false,
  openWorldHint: false,
};

/** Annotations of activity_checkpoint: it only adds a journal entry, Framer is not touched. */
export const CHECKPOINT_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

/** Annotations of a tool that rolls Framer changes back. */
export const REVERT_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
};

/** About 10k tokens, like nodes_read: an entry with big deleted-node snapshots is refused instead. */
export const ACTIVITY_GET_MAX_CHARS = 40_000;

/** Longest image side the model gets: bigger images are refused by the API or cost a lot of tokens. */
export const MAX_IMAGE_SIDE_PX = 2000;

/** What Framer answers when asked to export a component node instead of one of its variants. */
export const COMPONENT_EXPORT_ERROR = /exportable ground node/i;
