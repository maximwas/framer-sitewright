import {
  ACTIVITY_VIEWS,
  type ActivityLayer,
  type ActivitySummary,
  type ActivityView,
  type ChangeCategory,
} from "@sitewright/core";
import {
  Blend,
  BookOpen,
  CaseSensitive,
  Code,
  Component,
  CopyPlus,
  Database,
  Eye,
  FileMinus,
  FilePlus,
  Files,
  FileUp,
  Globe,
  History,
  ImageUp,
  Languages,
  Layers,
  LayoutGrid,
  Link2,
  type LucideIcon,
  MonitorSmartphone,
  MousePointer2,
  Palette,
  PanelsTopLeft,
  Pencil,
  PencilLine,
  PenTool,
  Plus,
  Replace,
  Rocket,
  Settings2,
  Shapes,
  Signpost,
  SlidersHorizontal,
  Sparkles,
  Square,
  StickyNote,
  Trash,
  Type,
  Unlink,
} from "lucide-react";
import type { Tone } from "../types/toolkit.ts";

/** The dot on an entry's icon when the call did not go well. */
export const OUTCOME_DOTS: Readonly<Record<ActivitySummary["outcome"], Tone | null>> = {
  ok: null,
  partial: "warn",
  failed: "danger",
};

/**
 * Text in a badge, centered on its letters rather than on the font's line box: Framer's font sits off-centre in that
 * box (the text sat off-centre in badges), so the box is trimmed to the cap height and the baseline.
 */
export const BADGE_TEXT = "leading-none [text-box:trim-both_cap_alphabetic]";

/** An item's icon when it went through no kind of change the panel knows: a text or link style, or a plain node. */
export const ITEM_ICONS: Readonly<Record<"text-style" | "link-style" | "node" | "cms-item", LucideIcon>> = {
  "text-style": CaseSensitive,
  "link-style": Link2,
  "cms-item": Database,
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
  content: {
    label: "Content",
    icon: Database,
    className: "bg-teal-500/20 text-teal-800 dark:bg-teal-400/25 dark:text-teal-200",
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
  cms: {
    label: "CMS",
    title: "Only the CMS: collections, fields and items Claude read or changed, and their undos",
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

/** The journal views as the switch offers them. */
export const FEED_VIEW_OPTIONS = ACTIVITY_VIEWS.map((view) => ({
  value: view,
  ...FEED_VIEW_LABELS[view],
}));

/**
 * How a call reached Framer, as a badge beside its time: the Plugin API in the open editor, the Server API's methods,
 * or Framer's agent layer (the DSL) on the Server API.
 */
export const LAYER_BADGES: Readonly<
  Record<ActivityLayer, { readonly label: string; readonly title: string; readonly tone: Tone }>
> = {
  "plugin-api": {
    label: "Plugin API",
    title: "Ran in the Framer editor, through the plugin",
    tone: "ok",
  },
  "server-api": {
    label: "Server API",
    title: "Ran through Framer's Server API",
    tone: "accent",
  },
  "framer-agent": {
    label: "Framer agent",
    title: "Ran through Framer's agent layer (the DSL) on the Server API",
    tone: "violet",
  },
};

/** A skill Claude used: a book, beside the eye of a read. */
export const SKILL_ICON: LucideIcon = BookOpen;

/**
 * An entry's icon by the operation it ran, for a change that touched nothing the badges know (a preview, an upload, a
 * publish, a page): the operation's own, else its family's (the name before the first dot).
 */
export const OPERATION_ICONS: Readonly<Record<string, LucideIcon>> = {
  breakpoints: MonitorSmartphone,
  cms: Database,
  codeFiles: Code,
  customCode: Code,
  colorTokens: Palette,
  colors: Palette,
  components: Component,
  "components.insertSection": PanelsTopLeft,
  "components.detach": Unlink,
  "components.makeLocal": CopyPlus,
  "components.setControls": SlidersHorizontal,
  "nodes.copyStyles": Palette,
  "nodes.clone": CopyPlus,
  design: Layers,
  editor: MousePointer2,
  files: FileUp,
  fonts: Type,
  history: History,
  icons: Shapes,
  images: ImageUp,
  layout: LayoutGrid,
  linkStyles: Link2,
  localization: Languages,
  motion: Sparkles,
  nodes: Layers,
  pages: Files,
  pluginData: StickyNote,
  forms: Layers,
  theme: Code,
  "pages.create": FilePlus,
  "pages.delete": FileMinus,
  project: Globe,
  "project.publish": Rocket,
  redirects: Signpost,
  selection: MousePointer2,
  shaders: Blend,
  site: Globe,
  "site.settings.set": Settings2,
  styles: Palette,
  svg: PenTool,
  text: Replace,
  textStyles: CaseSensitive,
};

/** A change no operation icon fits: a pencil, never an empty square. */
export const FALLBACK_ENTRY_ICON: LucideIcon = PencilLine;
