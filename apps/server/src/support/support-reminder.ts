import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { SupportLink } from "@sitewright/core";
import { SUPPORT_REMINDER_INTERVAL_MS } from "../constants/support.ts";
import { SupportStateSchema } from "../schemas/support.ts";
import type { SupportReminderOptions } from "../types/support.ts";
import { supportNote } from "../utils/support-note.ts";

/**
 * When Claude may mention how to support the project: only with links to show, only while the user allows it (the
 * switch on the journal page, SITEWRIGHT_SUPPORT_REMINDERS), and at most once a week on the machine. The caller asks
 * only after a change that worked, never on an error.
 */
export class SupportReminder {
  readonly #options: SupportReminderOptions;
  readonly #links: readonly SupportLink[];
  readonly #now: () => number;

  constructor(options: SupportReminderOptions) {
    this.#options = options;
    this.#links = options.links;
    this.#now = options.now ?? Date.now;
  }

  /** The note to pass on now, which counts as shown; or null. Never throws: the call it rides on worked. */
  async due(): Promise<string | null> {
    try {
      if (
        this.#links.length === 0 ||
        !this.#options.enabled ||
        !(await this.#options.settings.get()).supportReminders
      ) {
        return null;
      }

      const last = await this.#lastShownAt();

      if (last !== null && this.#now() - last < SUPPORT_REMINDER_INTERVAL_MS) {
        return null;
      }

      await mkdir(dirname(this.#options.file), { recursive: true });
      await writeFile(this.#options.file, `${JSON.stringify({ lastShownAt: new Date(this.#now()).toISOString() })}\n`);

      return supportNote(this.#links);
    } catch {
      return null;
    }
  }

  async #lastShownAt(): Promise<number | null> {
    try {
      const state = SupportStateSchema.parse(JSON.parse(await readFile(this.#options.file, "utf8")));

      return Date.parse(state.lastShownAt);
    } catch {
      return null;
    }
  }
}
