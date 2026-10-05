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
 * The MCP `instructions`: how the agent should approach the tools. They carry what the live build of 30.09.2026
 * taught (agent/specs/2026-09-30-live-build-lessons.md), so every session knows what Framer can do and how.
 */
export const SERVER_INSTRUCTIONS = [
  `${PRODUCT.title} edits the Framer project open in its plugin, and nothing runs while the plugin is not connected (ask the user to open it and click Connect). Start with project_overview. Each project has its own Server API key; framer_status lists the projects with a saved key, and when the user names another project, switch with framer_connect { project } before anything else (opening the plugin in a project switches too). When the user points at something in the editor ("this", "the selected"), call selection_get for its ids.`,
  // Design quality.
  "Before building or restyling a page, read design_guide (workflow first, then the topic for the task) and write out the direction it asks for. Set stackAlignment and stackDistribution on every stack you create: a stack centers its children by default, so a label lands in the middle over left-aligned text. Keep one content width (maxWidth and side padding) for the header, every section and the footer; put links on frames around the text, not on text nodes (text links take Framer's default blue); turn on balance in heading text styles. design_apply returns audit findings for what it touched: fix every defect before the next section, and run layout_audit on the page before calling it done.",
  // Transports.
  `With the ${PRODUCT.title} plugin open, calls run through it and land live in the editor; the DSL (design_apply, nodes_read), screenshots and catalogs go through the Server API on the same project. Without a Server API key (framer_status shows it), design_apply and nodes_read work through the Plugin API: XML only, creating FrameNode and RichTextNode with plain text, setting layout, size, position, fill (a color, a token, an image URL, which is uploaded, or a linear-gradient), radius, border, link and textStylePreset; effects, transitions, variants, components, textColor and type on a text node, rich text blocks, shadows and radial or conic gradients need a key, and a batch that asks for them changes nothing and says so. Color text through its text style there. New nodes need parent="<id>". Breakpoints work without a key too: breakpoints_add, then overrides on their copies.`,
  // Design system and folders.
  'Design system: color_tokens_* and text_styles_* (fonts_search for families). A "/" in a style or component name makes a folder (name="Content/Card"): group components by role (Brand, Navigation, Controls, Content), keep style names flat unless the user wants folders. A folder has no API of its own: it disappears with its last item, so empty it with the folders option of the delete tools. When the DSL refuses a library family that fonts_search lists ("No available font variant"), set the font with text_styles_upsert via plugin-api. Fonts uploaded to the project (fonts_search source "project") go through the DSL; Framer swaps a weight the project lacks without an error, and text_styles_upsert lists those styles in fontFallbacks: tell the user which weight to upload.',
  "Text style breakpoints are slots, not widths: medium, small, extraSmall in order (the tool adds skipped ones), starting at the page breakpoints from the top, the narrowest at 0.",
  // Building pages.
  'Pages: read framer_docs ("Updating the Project") for node types and attributes, read with nodes_read (XML), write with design_apply xml and fix every error. New nodes go last in their parent unless index is given. Fixed and absolute layers take px or % sizes, never fr; pins (left, right, top, bottom) take px only. Write whole numbers in px (sizes, pins, gaps, padding), and in gradient percentages and fr weights too: round 569.15px from a design to 569px, and pick an aspectRatio whose height × ratio comes out whole; design_apply warns about fractional px. To stretch an absolute layer over its parent (a background, a photo in a frame), pin all four sides to 0px instead of width and height 100%; never auto there, it collapses. To centre an absolute layer give centerAnchorX="50%" (or centerAnchorY) and no pins on that axis: design_apply creates it pinned and then unpins it. A link to /#id needs the target section to have elementId and scrollTargetEnabled first.',
  'Breakpoints are a primary frame plus copies (replicas): add them with breakpoints_add (Tablet 810, Phone 390; with a key CREATE_VARIANT works too), before giving text styles breakpoint sizes. Build and delete layers in the primary breakpoint only; adapt a breakpoint by overriding its copy of a node with design_apply, by the compound id <breakpoint id><node id> (real ids, not temp ids from the same batch). A copy takes overrides only: no new layers inside it, and a layer that should not show there gets visible="false" on its copy. layout_audit reports what a narrow breakpoint kept from desktop (narrow-* findings).',
  "Silent pitfalls: setting text on a variant or breakpoint copy of styled text drops its text style, so repeat textStylePreset in the same SET; a wrapping stack with width auto collapses to one column; aspectRatio needs a px height, not auto; text gets curly quotes and … automatically, so write code samples without quotes. Grid rows: gridRowHeightType auto makes every row as tall as the tallest, so cells with height 1fr fill multi-column rows; on a breakpoint where the grid is one column switch to fit, or short cells leave empty bands; fit in multi-column rows shows the grid's fill under short cells. Stacks have no stretch alignment: a child with height 1fr in a horizontal stack of height auto stretches to its tallest sibling, which gives equal-height columns. To drop a side border on a breakpoint, make it transparent; width 0 leaves an incomplete border. Effects and scale are refused on a variant or breakpoint root: use a hover or pressed gesture variant, or put them on a child. A new loopEffect starts from Framer’s preset, a full turn (rotate 360): always write loopEffect.rotate=\"0\" (and any other transform you do not animate) for a bob or pulse. Springs depend on the attribute: styleTransformEffect.transition keeps spring-physics (stiffness damping mass delay), and a spring-duration written there turns into Framer's default physics 500 60 1; a variant transition or appearEffect.enter.transition keeps spring-duration <time> <bounce> <delay> only, and spring-physics written there falls back to spring-duration 0.4s 0.2 (when the user wants Physics there, tell them to set it in the editor). Read the result back with nodes_read. On an onMount appear effect keep spring-duration even if Physics is set by hand: a Physics spring there makes Framer restart the opacity animation after hydration, and the layer vanishes for one frame when it ends. A layer's own rotation adds to the rotate of its styleTransformEffect states, so subtract it from the states. A scroll-pinned step section: the section (no zIndex, so the page lines stay between the background and the content) holds an absolute Background block z0 with its own gradient, which scrolls under the pinned content and so seems to change, then a transparent position sticky stage of 100vh (zIndex 2), then static copies of the later steps, 100vh each (instances of the step component, scrollTargetEnabled + elementId): they give the section its height, show every step in the editor and are the scroll targets. Hide the copies on the site with a styleTransformEffect whose states have opacity 0 (effects do not run on the canvas). scrollVariantEffect switches when a target's top crosses threshold × viewport height (0.5 = the middle) and keeps the last target's variant after it. Write scrollVariantEffect sections when the node is created: a SET of its sections on an existing node is silently ignored, so recreate the instance to change them. styleTransformEffect onScrollTarget follows the scroll: while a target passes the viewport line (viewport start, middle or end) the value moves linearly from the previous state to that target's state, and the transition only smooths it. A continuous change (a progress arc, a bar) therefore needs one target over the whole range, not a ladder of small ones: for a pinned section, the frame with the static copies and viewport end covers exactly the pinned scroll.",
  // Components, variants, interactions.
  'Components: +ComponentNode with a FrameNode as its primary variant; +Variable with scope=<component id> becomes a control bound with text="var(--variable-<id>)". Read exact control names with components_read before setting $control__* on instances. A code component’s object controls (arrows, dots, clipping) go through component_controls_set; a slot takes $control__<slot>.<i>="<id>" of a layer that is a direct child of the page. More variants: CREATE_VARIANT; hover and pressed states: CREATE_VARIANT gesture="hover". A click that switches variant (accordions, menus, tabs): onTap.0.action="SET_VARIANT" onTap.0.controls.variant="<variant id>" (or "cycle" for two variants) on a node inside the component; a component instance takes no onTap, so wrap it in a frame and put onTap on the frame. Publish (project_publish) only when the user asks: it puts the site live.',
  // Motion: build animations the way Framer's own guides do.
  'Motion: before building an animated pattern read its guide with framer_docs guide ("Effects"; "FAQ" for accordions, "Navigations" for menus, "Overlays", "Buttons"). Appear: appearEffect onMount above the fold, onInView below it, from opacity 0 and a small y (8-24), a tween of 0.3-0.6s (transition="tween <bezier> <duration> <delay>"), delays in steps for a sequence; appearEffect.replay="false" makes onInView play once (onMount plays once anyway). Hover on surfaces: hoverEffect.backgroundColor or opacity, and always hoverEffect.scale="1" with it: Framer fills in 1.1 by itself, which jumps; scale only when asked. Variant changes animate through transition: give every variant of a component the same one (default spring-duration 0.4s 0.2 0s).',
  'Anything that opens (accordion, mobile menu, dropdown) must not show and hide content with visible="false": that pops without animation. Give the closed variant a fixed height (its header row) and overflow="clip", the open variant height="auto" and overflow="clip", both the same transition; swap or rotate the icon in the same variants; set flowEffect.transition on the list holding the items and on the page breakpoint (the same transition), so the items and the sections below glide instead of jumping; fade the hidden part with opacity 0 in the closed variant; userSelect="none" on the clickable texts. When the user wants the content to appear as it opens instead, hide it with visible="false" in the closed variant and give it appearEffect.trigger="onMount": it mounts with the open variant and plays then (onInView is a scroll trigger, wrong here); a layout jump preventer component the user provides goes first in the stack above the items. Breakpoints take only flowEffect and pageEffects. textEffect by word or character, not on auto-fit text; tickerEffect for marquees (it also runs a CMS collection list; give it overflow="clip"); keep loopEffect rare: endless motion distracts.',
  // Assets.
  'Icons: icons_search, then +IconNode set="<set id>" $control__icon="<exact name>". Photos: images_search, then fill="<url>" with altText. Own files: image_upload. Logos and own icons are vectors, not images: svg_add through the plugin (parentId places it, nodeIds names it); to reuse one across the site, ask the user to add it to a project vector set (the API cannot), then place it as an IconNode of that set with width 1fr in a frame with aspectRatio. An icon from a project vector set given to a component instance\'s icon control is ignored by Framer (design_apply warns): bind it inside the component, give the component a variant per icon, or ask the user to pick it in the editor.',
  'When you create or restyle text, set textColor="var(--token-<id>)" on the RichTextNode itself, not only in its text style, so the token shows in Framer\'s Color field.',
  "Verify visual changes with node_screenshot, on every breakpoint. The Server API session keeps the project as it was when it connected: after people change it in the editor (vector sets, uploaded fonts, edits), call framer_connect with reconnect: true.",
  // Code.
  "Code (custom_code_set, code_file_write) only when the user asks for it or the canvas cannot do the task, and say why first; both are switched off in the Settings of the journal page (activity_open gives its link) until the user turns them on.",
  // Journal.
  "A tool result may carry support: one sentence on supporting this free project. Pass it to the user once, at the end of your reply, word for word; never bring support up yourself.",
  "Every change is journaled: call activity_checkpoint when a new user task starts; activity_undo reverts the last change (andLater: that entry and everything after it) and activity_restore rolls back to a checkpoint (preview first).",
  "The user can undo your changes on the journal page: activity.userChanges in tool results lists what they reverted since your last call, so re-read before building on it.",
  "project_overview reports what the project's Framer plan allows (capabilities); when it is limited, tell the user before using features of higher plans.",
].join(" ");

/** design_apply: XML first, since nesting shows the structure and nodes_read prints the same format. */
export const DESIGN_APPLY_DESCRIPTION = [
  "Changes a page and returns Framer's diagnostics (errors, warnings, lint, renamedIds). Prefer xml; dsl (raw +Node/SET/DEL/MOVE/DUPE commands) runs after it, for moves and duplicates.",
  "Without a Server API key it runs through the Plugin API: xml only, frames and plain text, the attributes listed in the server instructions, and overrides on breakpoint copies by compound id; anything else refuses the whole batch before a change.",
  'XML: tags are node types, attributes are DSL attributes (framer_docs), every value in quotes. An element without id is created: nested ones under their parent element, a top-level one under parent="<id>", at the end unless index="<n>" is given; key="hero" returns its real id in keys, and @hero in any value (scope, component, parent, var(--variable-@label), and the dsl part) points at it within the batch.',
  'An element with id gets a SET of only the attributes it lists; $delete="true" deletes it. Nesting existing nodes only addresses them: nothing moves and omitted children stay.',
  "Inside an existing rich text, blocks and runs without id are the ones at that position (as nodes_read prints them); give a new one a key.",
  'Text: plain text inside a RichTextNode, or <TextBlock tag="h1">…</TextBlock> blocks with <TextRun bold="true">…</TextRun> runs; write & and < as &amp; and &lt;. Nested attributes are dotted: hoverEffect.scale="1".',
  'Color text with a token on the RichTextNode itself, textColor="var(--token-<id>)", not only through its text style: only then does the token show in Framer\'s Color field. Fix every error and re-apply.',
].join(" ");

/**
 * The rule for the code tools: the canvas comes first, code only on request or when nothing else
 * works, and the user hears about it before any code is written.
 */
export const CODE_TOOLS_RULE =
  "Use only when the user explicitly asks for custom code or a code component, or when the canvas (design_apply: components, variants, effects, interactions) cannot do what they asked. In that case tell the user why code is needed before writing it. Never choose code on your own for something the canvas can build.";

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
