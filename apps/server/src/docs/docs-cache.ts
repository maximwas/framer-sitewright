import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type DocSection, splitSections } from "@sitewright/core";
import { DOCS_MAX_AGE_MS } from "../constants/docs.ts";
import type { CachedText, DocsCacheOptions } from "../types/docs.ts";

/**
 * Framer's agent system prompt is ~250 KB: fetch it rarely, keep it on disk, serve it in sections.
 * A stale copy still beats no reference when a refresh fails (no network, or no Server API).
 */
export class DocsCache {
  readonly #options: DocsCacheOptions;
  #sections: Promise<DocSection[]> | null = null;

  constructor(options: DocsCacheOptions) {
    this.#options = options;
  }

  get filePath(): string {
    return join(this.#options.cacheDir, `framer-agent-system-prompt-${this.#options.apiVersion}.md`);
  }

  /** Concurrent callers share one load. A failed load is forgotten, so the next call tries again. */
  getSections(load: () => Promise<string>): Promise<DocSection[]> {
    if (this.#sections === null) {
      const loading = this.#load(load);

      this.#sections = loading;
      loading.catch(() => {
        if (this.#sections === loading) {
          this.#sections = null;
        }
      });
    }

    return this.#sections;
  }

  async #load(load: () => Promise<string>): Promise<DocSection[]> {
    const cached = await this.#readCached();

    if (cached?.fresh) {
      return splitSections(cached.text);
    }

    return splitSections(await this.#refresh(load, cached?.text ?? null));
  }

  async #refresh(load: () => Promise<string>, stale: string | null): Promise<string> {
    let text: string;

    try {
      text = await load();
    } catch (error) {
      if (stale === null) {
        throw error;
      }

      this.#options.logger?.warn({ err: error }, "Could not refresh the DSL reference; using the cached copy");

      return stale;
    }

    await this.#store(text);

    return text;
  }

  async #readCached(): Promise<CachedText | null> {
    const maxAge = this.#options.maxAgeMs ?? DOCS_MAX_AGE_MS;
    const now = (this.#options.now ?? Date.now)();

    try {
      const info = await stat(this.filePath);

      return {
        text: await readFile(this.filePath, "utf8"),
        fresh: now - info.mtimeMs <= maxAge,
      };
    } catch {
      return null;
    }
  }

  /** Writes a temp file and renames it, so a crash never leaves half a reference. A failed write costs a refetch. */
  async #store(text: string): Promise<void> {
    const temp = `${this.filePath}.${process.pid}.tmp`;

    try {
      await mkdir(this.#options.cacheDir, { recursive: true });
      await writeFile(temp, text, "utf8");
      await rename(temp, this.filePath);
    } catch (error) {
      this.#options.logger?.warn({ err: error }, "Could not cache the DSL reference on disk");
    }
  }
}
