import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { DocsCache } from "../src/docs/docs-cache.ts";

const PROMPT = "# Overview\nHello.\n# Updating the Project\nGrammar.\n";

describe("DocsCache", () => {
  it("fetches the ~250 KB prompt once, reuses the file, and refetches when stale", async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), "sitewright-docs-"));
    const load = vi.fn(async () => PROMPT);

    await new DocsCache({
      cacheDir,
      apiVersion: "5.1.0",
    }).getSections(load);
    await new DocsCache({
      cacheDir,
      apiVersion: "5.1.0",
    }).getSections(load);
    expect(load).toHaveBeenCalledTimes(1);

    const stale = new DocsCache({
      cacheDir,
      apiVersion: "5.1.0",
      maxAgeMs: 1000,
      now: () => Date.now() + 5000,
    });

    await stale.getSections(load);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
