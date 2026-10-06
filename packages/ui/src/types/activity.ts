import type { ActivitySummary, ActivityView, JournalProject, RevertReport } from "@sitewright/core";
import type * as z from "zod";
import type { ActivityListSchema } from "../schemas/activity.ts";

/** The project's activity journal as the plugin window lists it. */
export type ActivityList = z.infer<typeof ActivityListSchema>;

/** One item an entry changed: a color token or a text style. */
export type ActivityItem = ActivitySummary["items"][number];

/** The view the page shows, remembered in this browser. */
export interface FeedViewState {
  readonly view: ActivityView;
  /** The project whose journal the page shows, by id; null follows the project the plugin is open in. */
  readonly project: string | null;
  setView(view: ActivityView): void;
  setProject(project: string | null): void;
}

/** Whose journal the page shows, and whether it can act on it. */
export interface ViewedProject {
  readonly projects: readonly JournalProject[];
  /** The project the plugin is open in (or this session's), whose journal undo works on. */
  readonly shown: { readonly id: string; readonly name: string } | null;
  /** The project picked in the switch, when it is another one; null: the shown project. */
  readonly picked: string | null;
  /** Another project's journal, or no project open in the plugin: look, do not undo. */
  readonly readOnly: boolean;
}

export interface RestoreOptions {
  /** Only report what would happen. */
  readonly dryRun: boolean;
  /** Also revert items someone changed after the AI (conflicts). */
  readonly force: boolean;
}

/** Data the window loads from the server: nothing while disconnected, then loading, the value, or why it failed. */
export type ServerData<T> =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly value: T }
  | { readonly status: "error"; readonly message: string };

/** The journal as the page shows it, live from the server. */
export type ActivityFeed = ServerData<ActivityList>;

/** Journal actions of the window. Each one reports how it went in a Framer notification. */
export interface ActivityActions {
  /** An action is running; the buttons wait for it. */
  readonly busy: boolean;
  undo(entry?: ActivitySummary): Promise<void>;
  redo(entry?: ActivitySummary): Promise<void>;
  /** Resolves with whether the checkpoint was marked. */
  checkpoint(label: string): Promise<boolean>;
  /** Starts the journal over, another project's when its id is given; resolves with whether it was cleared. */
  clear(project?: string): Promise<boolean>;
}

/** The restore dialog: which checkpoint, the dry run's preview once it is in, and whether the restore runs. */
export interface RestoreState {
  readonly checkpoint: ActivitySummary;
  readonly preview: RevertReport | null;
  readonly running: boolean;
  readonly error: string | null;
}

/** Opening, confirming and closing the restore dialog. */
export interface RestoreFlow {
  readonly state: RestoreState | null;
  open(checkpoint: ActivitySummary): void;
  confirm(force: boolean): Promise<void>;
  close(): void;
}

/** One item of the restore preview and what the restore does to it. */
export interface PreviewItem {
  readonly id: string;
  readonly path: string;
  readonly outcome: RevertReport["results"][number]["outcome"];
}
