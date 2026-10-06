import type { ActivityActor, ActivityEntry, AnyOperation, HistoryRecorder, TransportKind } from "@sitewright/core";
import type { JournalStore } from "../history/journal-store.ts";
import type { Logger } from "./logging.ts";
import type { CallTrace, OperationRunner } from "./transports.ts";

/** What one read of a journal file found: complete entries, the byte they end at, and whether it restarted at 0. */
export interface JournalChunk {
  readonly entries: readonly ActivityEntry[];
  readonly end: number;
  readonly fromStart: boolean;
  /** Which file was read (device, inode, birth time); null while there is none. A new one means it was replaced. */
  readonly file: string | null;
}

/** An entry before the journal gives it its id, number, time, project and session. */
export type EntryDraft = Omit<ActivityEntry, "id" | "seq" | "at" | "project" | "session">;

export interface JournalOptions {
  /** null when the journal is off (SITEWRIGHT_HISTORY=off): tools still run, nothing is recorded. */
  readonly store: JournalStore | null;
  readonly transports: OperationRunner;
  readonly logger: Logger;
  readonly now?: () => number;
}

export interface RevertRequest {
  readonly dryRun: boolean;
  /** Who asked: the AI through an MCP tool, or the user in the plugin window. */
  readonly actor: ActivityActor;
  /** skip leaves items someone changed after the AI; force overwrites them. */
  readonly onConflict: "skip" | "force";
}

export type RevertKind = "undo" | "redo" | "restore";

/** What a finished or failed revert writes to the journal; `history` is undefined on a dry run, which writes nothing. */
export interface RevertRecord {
  readonly kind: RevertKind;
  readonly title: string;
  readonly targets: readonly ActivityEntry[];
  readonly history: HistoryRecorder | undefined;
  readonly started: number;
  /** Items the revert kept because they changed after the AI. */
  readonly conflicts: number;
  readonly error: unknown;
  readonly request: RevertRequest;
  /** The transport the revert ran on. */
  readonly transport: TransportKind;
  readonly trace: CallTrace;
}

/** One tool call the journal runs and records. */
export interface JournaledCall {
  readonly tool: string;
  readonly operation: AnyOperation;
  readonly input: unknown;
  /** Undefined for reads, which record no undo steps. */
  readonly history: HistoryRecorder | undefined;
  readonly trace: CallTrace;
  readonly started: number;
}
