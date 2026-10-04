import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { type McpSettings, type McpSettingsPatch, McpSettingsSchema } from "@sitewright/core";
import type { Logger } from "../types/logging.ts";

/**
 * The switches from the plugin, in one file every Claude Code session reads: a switch flipped in one tab applies to
 * all of them. Read on every use, so there is nothing to keep in sync; a missing or broken file means the defaults.
 */
export class SettingsStore {
  readonly #file: string;
  readonly #logger: Logger;

  constructor(file: string, logger: Logger) {
    this.#file = file;
    this.#logger = logger;
  }

  async get(): Promise<McpSettings> {
    let raw: string;

    try {
      raw = await readFile(this.#file, "utf8");
    } catch {
      return McpSettingsSchema.parse({});
    }

    try {
      return McpSettingsSchema.parse(JSON.parse(raw));
    } catch (error) {
      this.#logger.warn({ err: error }, "Settings file is broken; using the defaults");

      return McpSettingsSchema.parse({});
    }
  }

  /** Changes the given switches and returns all of them. Written whole and renamed, so no reader sees half a file. */
  async set(patch: McpSettingsPatch): Promise<McpSettings> {
    const next = McpSettingsSchema.parse({
      ...(await this.get()),
      ...patch,
    });
    const temporary = `${this.#file}.${process.pid}.tmp`;

    await mkdir(dirname(this.#file), { recursive: true });
    await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`);
    await rename(temporary, this.#file);

    return next;
  }
}
