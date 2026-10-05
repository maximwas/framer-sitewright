/** How sure an audit finding is: a visible defect, a likely one, or a design habit worth a second look. */
export const AUDIT_SEVERITIES = ["defect", "likely", "taste"] as const;

/** Findings a single audit returns at most, most severe first. */
export const AUDIT_MAX_ISSUES = 40;

/** How deep the audit reads: deep enough for section > container > card > text. */
export const LAYOUT_AUDIT_DEPTH = 8;

/**
 * How long design_apply waits for the audit of what it touched. The batch is applied already; a slow read (a big page
 * through the plugin) must not push the call past the bridge's timeout, so the audit is skipped instead.
 */
export const AUDIT_AFTER_APPLY_MS = 8_000;

/** A content width above this in px breaks on narrower screens unless it is media. */
export const FIXED_WIDTH_LIMIT_PX = 400;

/** How many repeats make a habit (uppercase labels over headings, numbered cards). */
export const TEMPLATE_REPEAT = 3;

/** A frame no taller than this with no children is a divider line, not a section. */
export const DIVIDER_MAX_PX = 2;

/** Distinct vertical section paddings a page can have before its rhythm reads as accidental. */
export const SECTION_RHYTHM_MAX = 2;

/** The gap Framer gives every new stack; with space-between it is Framer's, not a choice. */
export const DEFAULT_STACK_GAP = "10px";

/** A radius this large makes a pill: round on purpose, not a nested corner. */
export const PILL_RADIUS_PX = 100;

/** Stack distributions that place children themselves, so `gap` has no effect. */
export const SPACED_DISTRIBUTIONS: ReadonlySet<string> = new Set(["space-between", "space-around", "space-evenly"]);

/** Widths that span the parent. */
export const FILL_SIZES: ReadonlySet<string> = new Set(["100%"]);

/** Widths that hug the content. */
export const FIT_SIZES: ReadonlySet<string> = new Set(["auto", "fit-content", "min-content", "max-content"]);

/** Heading tags, in order. */
export const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

/** A card's first text that only counts it: "01", "2", "03.". */
export const SEQUENCE_NUMBER = /^\s*0?\d{1,2}\.?\s*$/;

/** A color written out rather than taken from a token. */
export const RAW_COLOR = /#[\da-f]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/i;

/** From this size up a text style is display type: tracking goes negative and lines get tight. */
export const DISPLAY_SIZE_PX = 40;

/** The loosest line height display type gets on top Framer sites. */
export const DISPLAY_LINE_HEIGHT_MAX = 1.25;

/** The largest heading over the body size below which nothing dominates (top sites: median about 6.5). */
export const HIERARCHY_RATIO_MIN = 3.5;

/** Paragraph styles from this size to BODY_SIZE_MAX_PX are body text; larger ones are a quote or a lead, not body. */
export const BODY_SIZE_MIN_PX = 14;

export const BODY_SIZE_MAX_PX = 24;

/** A breakpoint at most this wide is a phone; at most TABLET_MAX_WIDTH_PX, a tablet. */
export const PHONE_MAX_WIDTH_PX = 600;

export const TABLET_MAX_WIDTH_PX = 1024;

/** Grid columns that still fit: on a phone two (logos, thumbnails), on a tablet three. */
export const PHONE_GRID_MAX_COLUMNS = 2;

export const TABLET_GRID_MAX_COLUMNS = 3;

/** A child of a horizontal stack this wide (or filling) is a column, which a phone has no room for beside another. */
export const ROW_COLUMN_MIN_PX = 120;

/** Side padding a phone section can afford (top sites: 16–24px). */
export const PHONE_SIDE_PADDING_MAX_PX = 32;

/** The largest heading a 390px screen holds without breaking words (top sites: 40–56px). */
export const PHONE_HEADING_MAX_PX = 56;

/** Above this share of centered headings a page reads as centered everything (top sites: about 16%). */
export const CENTERED_SHARE_MAX = 0.5;

/** Headings a page needs before the centered share means anything. */
export const CENTERED_MIN_HEADINGS = 4;

/** A text at least this long with width auto in a column does not wrap to the column. */
export const AUTO_TEXT_CHARS = 30;

/** Size rules a breakpoint frame is exempt from: its width is where the breakpoint starts. */
export const BREAKPOINT_SIZE_RULES: ReadonlySet<string> = new Set(["fixed-width", "fixed-height"]);

/** Positions that take a viewport height on purpose: a sticky stage, a fixed overlay. */
export const VIEWPORT_POSITIONS: ReadonlySet<string> = new Set(["sticky", "fixed"]);
