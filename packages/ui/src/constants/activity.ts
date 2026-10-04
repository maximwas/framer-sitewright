import type { ActivityView, RevertReport } from "@sitewright/core";

/** Server events after which the panel reloads the journal. */
export const JOURNAL_EVENTS: ReadonlySet<string> = new Set([
  "activity.appended",
  "activity.cleared",
  "activity.changed",
]);

/** How many journal entries the window loads; older ones stay in the journal. */
export const FEED_LIMIT = 100;

/** Chips shown per entry before "+N more". */
export const CHIP_LIMIT = 6;

/** localStorage key of the journal view the page shows (all, changes, reads, skills). */
export const FEED_VIEW_STORAGE_KEY = "sitewright:feed-view";

/** The width image previews are loaded at: twice their size in the panel, for dense screens. */
export const THUMBNAIL_PX = 160;

/** What the page says over another project's journal: undo needs the project open in the editor. */
export const OTHER_PROJECT_NOTE =
  "Another project's journal, to look at: undo, redo and restore work in the project the plugin is open in.";

/** What the page says while no project is open in the plugin: the journal shows, undo waits for the editor. */
export const NO_PLUGIN_NOTE = "Open the plugin in this project to undo, redo or restore from here.";

/** What the empty journal says, per view. */
export const EMPTY_FEED_TEXT: Readonly<Record<ActivityView, string>> = {
  all: "Nothing yet. What Claude reads and changes in this project will show up here.",
  changes: "Nothing yet. Changes Claude makes to this project will show up here, ready to undo.",
  reads: "Nothing read yet. What Claude looks at in this project will show up here.",
  skills:
    "No skills yet. The skills Claude uses for this project show up here once the Claude Code hooks are on (setup --hooks).",
};

/** What a restore does to each item, as the preview lists it. */
export const REVERT_OUTCOME_LABELS: Readonly<Record<RevertReport["results"][number]["outcome"], string>> = {
  deleted: "Delete",
  restored: "Restore",
  recreated: "Recreate",
  unchanged: "Already as before",
  gone: "Already gone",
  conflict: "Changed since",
};
