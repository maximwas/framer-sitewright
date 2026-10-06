import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import {
  type ActivityActor,
  type ActivityDetail,
  type ActivityEntry,
  type ActivityLayer,
  type ActivityNote,
  describeCall,
  describeOperation,
  errorMessage,
  HistoryRecorder,
  type JournalProject,
  type Operation,
  refOf,
  trimDetail,
  type UndoStep,
} from "@sitewright/core";
import type * as z from "zod";
import { UNKNOWN_OUTCOME_NOTE } from "../constants/history.ts";
import { SKILL_NOTE_PENDING_MAX, SKILL_NOTE_PENDING_MS } from "../constants/skills.ts";
import { currentProject, knownProject } from "../transports/current-project.ts";
import type { EntryDraft, JournaledCall, JournalOptions } from "../types/history.ts";
import type { SkillNote } from "../types/skills.ts";
import type { CallTrace, OperationRunner, ProjectRef } from "../types/transports.ts";
import { layerOf } from "../utils/activity-layer.ts";
import type { JournalStore } from "./journal-store.ts";
import { outcomeUnknown } from "./outcome.ts";
import { ProjectLog } from "./project-log.ts";

/**
 * Everything the AI does, per project: every tool call becomes an entry, and writes carry the undo steps of what they
 * changed. Writes and reverts run one at a time, so an undo never interleaves with the AI's next write.
 */
export class ActivityJournal extends EventEmitter<{ appended: [ActivityEntry]; cleared: [] }> {
  readonly #options: JournalOptions;
  readonly #now: () => number;
  readonly #logs = new Map<string, ProjectLog>();
  /** Per project, the newest entry the AI has been told about (see noteFor). */
  readonly #toldAi = new Map<string, number>();
  /** This process: the session an undo without an entry is limited to. */
  readonly #session = randomUUID();
  /** Skills the AI activated before this session knew its project (see noteSkill). */
  #pendingSkills: SkillNote[] = [];
  #lock: Promise<unknown> = Promise.resolve();

  constructor(options: JournalOptions) {
    super();
    this.#options = options;
    this.#now = options.now ?? Date.now;
  }

  get transports(): OperationRunner {
    return this.#options.transports;
  }

  /** The session this journal records for; several agents' processes share one journal. */
  get session(): string {
    return this.#session;
  }

  /** The journal's clock, for entries timed elsewhere (reverts). */
  now(): number {
    return this.#now();
  }

  /**
   * Runs a tool's operation on the active transport and journals the call; `entry` is null when nothing was recorded.
   * A write keeps the lock until its entry is in the journal, so an undo queued behind it sees the entry.
   */
  run<I extends z.ZodObject, O extends z.ZodObject>(
    tool: string,
    operation: Operation<I, O>,
    input: unknown,
  ): Promise<{ output: z.output<O>; entry: ActivityEntry | null }> {
    const history = operation.effect === "read" ? undefined : new HistoryRecorder();
    const trace: CallTrace = { usedAgent: false };
    const started = this.#now();
    const task = async () => {
      const call = {
        tool,
        operation,
        input,
        history,
        trace,
        started,
      };

      try {
        const output = await this.transports.run(
          operation,
          input,
          history === undefined
            ? { trace }
            : {
                history,
                trace,
              },
        );

        return {
          output,
          entry: await this.#recordRun(
            call,
            operation.refused?.(output) ?? null,
            describeCall(operation, input, output),
          ),
        };
      } catch (error) {
        await this.#recordRun(call, error, null);

        throw error;
      }
    };

    return history === undefined ? task() : this.exclusive(task);
  }

  /**
   * Runs a read that is no operation (a screenshot, the DSL reference) and journals what it looked at, so the panel
   * shows it among the reads; `detail` may use the result (null after a failure), e.g. the name of the node shot. The
   * journal never fails it: only the read's own error is thrown. It never connects to Framer just to journal either: a
   * read before any project is known (the reference from its disk cache) stays out.
   */
  async read<T>(
    tool: string,
    title: string,
    layer: ActivityLayer,
    detail: (result: T | null) => Partial<ActivityDetail>,
    task: () => Promise<T>,
  ): Promise<T> {
    const started = this.#now();
    const record = async (error: unknown, result: T | null) => {
      const project = knownProject(this.transports);

      if (project === null) {
        return;
      }

      await this.record(
        {
          kind: "operation",
          actor: "ai",
          tool,
          operation: null,
          effect: "read",
          transport: "server-api",
          layer,
          title,
          outcome: error === null ? "ok" : "failed",
          error: error === null ? null : errorMessage(error),
          steps: [],
          incomplete: null,
          reverts: [],
          conflicts: 0,
          remap: {},
          label: null,
          durationMs: this.#now() - started,
          detail: trimDetail(detail(result)),
        },
        project,
      );
    };

    try {
      const result = await task();

      await record(null, result);

      return result;
    } catch (error) {
      await record(error, null);

      throw error;
    }
  }

  /** `project`: the project the plugin window shows; by default the one this session works on. */
  checkpoint(label: string, actor: ActivityActor, project?: ProjectRef): Promise<ActivityEntry | null> {
    return this.record(
      {
        kind: "checkpoint",
        actor,
        tool: actor === "ai" ? "activity_checkpoint" : null,
        operation: null,
        effect: null,
        transport: null,
        layer: null,
        title: `Checkpoint: ${label}`,
        outcome: "ok",
        error: null,
        steps: [],
        incomplete: null,
        reverts: [],
        conflicts: 0,
        remap: {},
        label,
        durationMs: 0,
        detail: null,
      },
      project,
    );
  }

  /**
   * Appends an entry for `project`, by default the current one, after the skills that waited for a project. Never
   * throws: a journal failure must not fail the tool call.
   */
  async record(draft: EntryDraft, forProject?: ProjectRef): Promise<ActivityEntry | null> {
    const store = this.#options.store;

    if (store === null) {
      return null;
    }

    try {
      const project = forProject ?? (await this.currentProject());

      if (project === null) {
        return null;
      }

      // The skills belong to this session's own project, not to one a journal window shows.
      if (forProject === undefined) {
        await this.#writeSkills(project);
      }

      return await this.#append(project, {
        ...draft,
        at: new Date(this.#now()).toISOString(),
      });
    } catch (error) {
      this.#options.logger.warn({ err: error }, "Could not write the activity journal");

      return null;
    }
  }

  /**
   * A skill the AI activated in this conversation (see SkillInbox), journaled for the project this session works on.
   * A skill comes before the first Framer call more often than not: until the session knows its project, it waits, so
   * conversations that never touch Framer write nothing. Never throws.
   */
  async noteSkill(note: SkillNote): Promise<void> {
    this.#pendingSkills = [...this.#pendingSkills, note].slice(-SKILL_NOTE_PENDING_MAX);

    const project = knownProject(this.transports);

    if (project === null || this.#options.store === null) {
      return;
    }

    try {
      await this.#writeSkills(project);
    } catch (error) {
      this.#options.logger.warn({ err: error }, "Could not write the activity journal");
    }
  }

  /**
   * Starts the current project's journal over: the changes stay in Framer, but can no longer be undone from here. The
   * old journal is archived on disk. Returns how many entries were cleared.
   */
  async clear(forProject?: ProjectRef): Promise<number> {
    const store = this.#options.store;
    const project = forProject ?? (await this.currentProject());

    if (project === null || store === null) {
      return 0;
    }

    const cleared = await this.#log(store, project.id).clear(new Date(this.#now()));

    this.#toldAi.delete(project.id);
    this.emit("cleared");

    return cleared;
  }

  /**
   * What goes back to the AI with a tool result: the call's own entry, and what the user did in the plugin window
   * since the AI was last told. The first note of a session starts from now, so older sessions are not replayed.
   */
  async noteFor(entry: ActivityEntry | null): Promise<ActivityNote> {
    const note: ActivityNote = {
      entry: entry === null ? null : refOf(entry),
      userChanges: [],
    };

    try {
      const project = entry?.project ?? (await this.currentProject());

      if (project === null) {
        return note;
      }

      const entries = await this.entries(project.id);
      const newest = entries.at(-1)?.seq ?? 0;
      const remembered = this.#toldAi.get(project.id) ?? newest;
      // A journal cleared in another session starts over at 1: everything in it is news.
      const told = remembered > newest ? 0 : remembered;

      this.#toldAi.set(project.id, newest);

      return {
        ...note,
        userChanges: entries.filter((candidate) => candidate.actor === "user" && candidate.seq > told).map(refOf),
      };
    } catch (error) {
      // The call itself succeeded: a journal that cannot be read must not fail it.
      this.#options.logger.warn({ err: error }, "Could not read the activity journal");

      return note;
    }
  }

  /** The project's entries, oldest first, including those other Claude Code sessions appended since the last read. */
  async entries(projectId: string): Promise<readonly ActivityEntry[]> {
    const store = this.#options.store;

    return store === null ? [] : this.#log(store, projectId).entries();
  }

  /** The projects with a journal on this computer, the newest change first. */
  async projects(): Promise<JournalProject[]> {
    return (await this.#options.store?.projects()) ?? [];
  }

  currentProject(): Promise<ProjectRef | null> {
    return currentProject(this.transports);
  }

  /** Journals the skills waiting for a project, oldest first; those older than the wait limit are dropped. */
  async #writeSkills(project: ProjectRef): Promise<void> {
    const oldest = this.#now() - SKILL_NOTE_PENDING_MS;
    const notes = this.#pendingSkills.filter((note) => Date.parse(note.at) >= oldest);

    this.#pendingSkills = [];

    for (const note of notes) {
      await this.#append(project, {
        kind: "skill",
        actor: "ai",
        tool: null,
        operation: null,
        effect: null,
        transport: null,
        layer: null,
        title: `Skill: ${note.skill}`,
        outcome: "ok",
        error: null,
        steps: [],
        incomplete: null,
        reverts: [],
        conflicts: 0,
        remap: {},
        label: null,
        durationMs: 0,
        detail: note.reference === null ? null : trimDetail({ subject: note.reference }),
        at: note.at,
      });
    }
  }

  async #append(project: ProjectRef, draft: EntryDraft & Pick<ActivityEntry, "at">): Promise<ActivityEntry> {
    const store = this.#options.store;

    if (store === null) {
      throw new Error("The activity journal is off.");
    }

    const entry = await this.#log(store, project.id).append((seq) => ({
      ...draft,
      id: randomUUID(),
      seq,
      project,
      session: this.#session,
    }));

    this.emit("appended", entry);

    return entry;
  }

  #log(store: JournalStore, projectId: string): ProjectLog {
    let log = this.#logs.get(projectId);

    if (log === undefined) {
      log = new ProjectLog(store, projectId);
      this.#logs.set(projectId, log);
    }

    return log;
  }

  /** Runs `task` after every earlier write or revert has finished. */
  exclusive<T>(task: () => Promise<T>): Promise<T> {
    const result = this.#lock.then(task);

    this.#lock = result.catch(() => undefined);

    return result;
  }

  #recordRun(call: JournaledCall, error: unknown, detail: ActivityDetail | null): Promise<ActivityEntry | null> {
    const { history, operation, input } = call;
    const steps = history === undefined ? [] : [...history.steps];
    const transport = this.transports.routeOf(operation, input);

    if (error !== null && outcomeUnknown(error)) {
      history?.markIncomplete(UNKNOWN_OUTCOME_NOTE);
    }

    return this.record({
      kind: "operation",
      actor: "ai",
      tool: call.tool,
      operation: operation.name,
      effect: operation.effect,
      transport,
      layer: layerOf(transport, call.trace),
      title: describeOperation(operation.name, steps),
      outcome: outcomeOf(error, steps),
      error: error === null ? null : errorMessage(error),
      steps,
      incomplete: history?.incomplete ?? null,
      reverts: [],
      conflicts: 0,
      remap: {},
      label: null,
      durationMs: this.#now() - call.started,
      detail,
    });
  }
}

function outcomeOf(error: unknown, steps: readonly UndoStep[]): ActivityEntry["outcome"] {
  if (error === null) {
    return "ok";
  }

  return steps.length > 0 ? "partial" : "failed";
}
