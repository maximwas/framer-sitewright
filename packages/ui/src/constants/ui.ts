import type { ActivityLayer, ActivitySummary, ActivityView, ChangeCategory } from "@sitewright/core";
import {
  BookOpen,
  CaseSensitive,
  Component,
  Eye,
  LayoutGrid,
  type LucideIcon,
  Palette,
  Pencil,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash,
  Type,
} from "lucide-react";

export const OUTCOME_DOT_COLORS: Readonly<Record<ActivitySummary["outcome"], string>> = {
  ok: "bg-emerald-500",
  partial: "bg-amber-500",
  failed: "bg-red-500",
};

/** A compact secondary button. framer.css makes every button full width and 30 px tall, so this undoes that. */
export const SMALL_BUTTON =
  "h-6 w-auto shrink-0 rounded-md px-2 text-[11px] disabled:cursor-default disabled:opacity-40";

/**
 * Text in a badge, centered on its letters rather than on the font's line box: Framer's font sits off-centre in that
 * box (the text sat off-centre in badges), so the box is trimmed to the cap height and the baseline.
 */
export const BADGE_TEXT = "leading-none [text-box:trim-both_cap_alphabetic]";

/** A button sharing a row: one line, an ellipsis when the window is too narrow (no wrapping into two lines). */
export const ROW_BUTTON = "min-w-0 flex-1 truncate disabled:cursor-default disabled:opacity-40";

/** An item's icon when it went through no kind of change the panel knows: a text style, or a plain node. */
export const ITEM_ICONS: Readonly<Record<"text-style" | "node", LucideIcon>> = {
  "text-style": CaseSensitive,
  node: Square,
};

/**
 * Each kind of change: its icon and color (icons read better than dots). A chip takes the tint and leading icon of the
 * first kind it went through and shows the further ones as small icons; the legend above the chips names them.
 */
export const CATEGORY_BADGES: Readonly<
  Record<ChangeCategory, { readonly label: string; readonly icon: LucideIcon; readonly className: string }>
> = {
  components: {
    label: "Components",
    icon: Component,
    className: "bg-violet-500/20 text-violet-800 dark:bg-violet-400/25 dark:text-violet-200",
  },
  animations: {
    label: "Animations",
    icon: Sparkles,
    className: "bg-amber-500/25 text-amber-900 dark:bg-amber-400/25 dark:text-amber-200",
  },
  text: {
    label: "Text",
    icon: Type,
    className: "bg-sky-500/20 text-sky-800 dark:bg-sky-400/25 dark:text-sky-200",
  },
  colors: {
    label: "Colors",
    icon: Palette,
    className: "bg-pink-500/20 text-pink-800 dark:bg-pink-400/25 dark:text-pink-200",
  },
  layout: {
    label: "Blocks",
    icon: LayoutGrid,
    className: "bg-emerald-500/20 text-emerald-800 dark:bg-emerald-400/25 dark:text-emerald-200",
  },
  settings: {
    label: "Settings",
    icon: SlidersHorizontal,
    className: "bg-slate-500/20 text-slate-800 dark:bg-slate-400/25 dark:text-slate-200",
  },
  styles: {
    label: "Styles",
    icon: CaseSensitive,
    className: "bg-indigo-500/20 text-indigo-800 dark:bg-indigo-400/25 dark:text-indigo-200",
  },
};

/**
 * What was done to an item, as a badge: how many an entry created, updated and deleted. Deleting stands out in red
 * (a deletion must stand out), and a deleted item's own chip turns red as well.
 */
export const CHANGE_BADGES: Readonly<
  Record<
    "created" | "updated" | "deleted",
    { readonly label: string; readonly icon: LucideIcon; readonly className: string }
  >
> = {
  created: {
    label: "created",
    icon: Plus,
    className: "bg-green-500/20 text-green-800 dark:bg-green-400/25 dark:text-green-200",
  },
  updated: {
    label: "updated",
    icon: Pencil,
    className: "bg-blue-500/20 text-blue-800 dark:bg-blue-400/25 dark:text-blue-200",
  },
  deleted: {
    label: "deleted",
    icon: Trash,
    className: "bg-red-500/25 text-red-800 dark:bg-red-500/30 dark:text-red-200",
  },
};

/** A node the AI read, as a badge like the changed ones: the eye says it was only looked at. */
export const READ_BADGE: { readonly icon: LucideIcon; readonly className: string } = {
  icon: Eye,
  className: "bg-cyan-500/20 text-cyan-800 dark:bg-cyan-400/25 dark:text-cyan-200",
};

/** The journal views, in the order of the switch. */
export const FEED_VIEW_LABELS: Readonly<Record<ActivityView, { readonly label: string; readonly title: string }>> = {
  all: {
    label: "All",
    title: "What Claude reads, changes and follows",
  },
  changes: {
    label: "Changes",
    title: "What Claude changes, with undo, and the skills it used for it",
  },
  reads: {
    label: "Reads",
    title: "Only what Claude reads: nodes, lists, searches, screenshots",
  },
  skills: {
    label: "Skills",
    title: "Only the skills Claude used (Claude Code hooks: setup --hooks)",
  },
};

/**
 * How a call reached Framer, as a badge beside its time: the Plugin API in the open editor, the Server API's methods,
 * or Framer's agent layer (the DSL) on the Server API.
 */
export const LAYER_BADGES: Readonly<
  Record<ActivityLayer, { readonly label: string; readonly title: string; readonly className: string }>
> = {
  "plugin-api": {
    label: "Plugin API",
    title: "Ran in the Framer editor, through the plugin",
    className: "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200",
  },
  "server-api": {
    label: "Server API",
    title: "Ran through Framer's Server API",
    className: "bg-sky-500/15 text-sky-800 dark:bg-sky-400/20 dark:text-sky-200",
  },
  "framer-agent": {
    label: "Framer agent",
    title: "Ran through Framer's agent layer (the DSL) on the Server API",
    className: "bg-violet-500/15 text-violet-800 dark:bg-violet-400/20 dark:text-violet-200",
  },
};

/** A skill Claude used: a book, beside the eye of a read. */
export const SKILL_ICON: LucideIcon = BookOpen;
