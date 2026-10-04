import {
  type ActivitySummary,
  type ActivityView,
  type Capabilities,
  CapabilitiesSchema,
  type McpSettings,
  type McpSettingsPatch,
  McpSettingsSchema,
  type ProjectKeyStatus,
  ProjectKeyStatusSchema,
  type RevertReport,
  RevertReportSchema,
} from "@sitewright/core";
import { JOURNAL_EVENTS } from "../constants/activity.ts";
import { ActivityListSchema, CheckpointResultSchema, ClearResultSchema } from "../schemas/activity.ts";
import type { ActivityList, RestoreOptions } from "../types/activity.ts";
import type { UiTransport } from "../types/host.ts";

/** The server's activity journal and the plan's limits, as typed calls over the host's transport. */
export class ActivityApiClient {
  readonly #transport: UiTransport;

  constructor(transport: UiTransport) {
    this.#transport = transport;
  }

  get transport(): UiTransport {
    return this.#transport;
  }

  /** The newest `limit` entries of one view: the changes, the reads, or all of them. */
  async list(limit: number, show: ActivityView): Promise<ActivityList> {
    return ActivityListSchema.parse(
      await this.#transport.call("activity.list", {
        limit,
        show,
      }),
    );
  }

  /** Undoes `entry` and every change after it (the project goes back to before it), or the newest change. */
  undo(entry?: ActivitySummary): Promise<RevertReport> {
    return this.#revert(
      "activity.undo",
      entry === undefined
        ? {}
        : {
            entryId: entry.id,
            andLater: true,
          },
    );
  }

  /** Reapplies `entry` (an undo or restore), or the newest one still in effect. */
  redo(entry?: ActivitySummary): Promise<RevertReport> {
    return this.#revert("activity.redo", entry === undefined ? {} : { entryId: entry.id });
  }

  /** Rolls back to a checkpoint; a dry run only reports what would happen. */
  restore(checkpoint: ActivitySummary, { dryRun, force }: RestoreOptions): Promise<RevertReport> {
    return this.#revert("activity.restore", {
      checkpointId: checkpoint.id,
      dryRun,
      onConflict: force ? "force" : "skip",
    });
  }

  async checkpoint(label: string): Promise<void> {
    CheckpointResultSchema.parse(await this.#transport.call("activity.checkpoint", { label }));
  }

  /** Starts the journal over; the changes stay in Framer. Resolves with how many entries were cleared. */
  async clear(): Promise<number> {
    return ClearResultSchema.parse(await this.#transport.call("activity.clear", {})).cleared;
  }

  /** The switches the user set in the plugin; every Claude Code session reads them. */
  async settings(): Promise<McpSettings> {
    return McpSettingsSchema.parse(await this.#transport.call("settings.get", {}));
  }

  /** Flips the given switches; resolves with all of them as the server now has them. */
  async setSettings(patch: McpSettingsPatch): Promise<McpSettings> {
    return McpSettingsSchema.parse(await this.#transport.call("settings.set", patch));
  }

  /** The Server API key of the project the plugin is open in: whether one is saved, never the key itself. */
  async keyStatus(): Promise<ProjectKeyStatus> {
    return ProjectKeyStatusSchema.parse(await this.#transport.call("keys.get", {}));
  }

  /** Saves a key for that project, once it opens it; `url` when the plugin could not give the project's link. */
  async saveKey(key: string, url?: string): Promise<ProjectKeyStatus> {
    return ProjectKeyStatusSchema.parse(
      await this.#transport.call(
        "keys.set",
        url === undefined
          ? { key }
          : {
              key,
              url,
            },
      ),
    );
  }

  async removeKey(): Promise<ProjectKeyStatus> {
    return ProjectKeyStatusSchema.parse(await this.#transport.call("keys.remove", {}));
  }

  /** What the project's Framer plan allows, or null while no project is connected. */
  async capabilities(): Promise<Capabilities | null> {
    return CapabilitiesSchema.nullable().parse(await this.#transport.call("capabilities.get", {}));
  }

  /** Runs `listener` whenever the journal changes (an entry is added, or it is cleared). Returns an unsubscribe. */
  onChange(listener: () => void): () => void {
    return this.#transport.onEvent((name) => {
      if (JOURNAL_EVENTS.has(name)) {
        listener();
      }
    });
  }

  async #revert(method: string, params: Record<string, unknown>): Promise<RevertReport> {
    return RevertReportSchema.parse(await this.#transport.call(method, params));
  }
}
