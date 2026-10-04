import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEnvFile } from "../src/config/env-file.ts";

const KEYS = ["SITEWRIGHT_TEST_BLANK", "SITEWRIGHT_TEST_SET", "SITEWRIGHT_TEST_UNSET"];

describe("loadEnvFile", () => {
  afterEach(() => {
    for (const key of KEYS) {
      delete process.env[key];
    }
  });

  it("fills unset and blank variables from .env and keeps the ones already set", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sitewright-env-"));

    await writeFile(
      join(dir, ".env"),
      "SITEWRIGHT_TEST_BLANK=file\nSITEWRIGHT_TEST_SET=file\nSITEWRIGHT_TEST_UNSET=file\n",
    );
    // What .mcp.json passes for "${VAR:-}" when the shell has no such variable.
    process.env.SITEWRIGHT_TEST_BLANK = " ";
    process.env.SITEWRIGHT_TEST_SET = "shell";

    loadEnvFile(dir);

    expect(process.env.SITEWRIGHT_TEST_BLANK).toBe("file");
    expect(process.env.SITEWRIGHT_TEST_SET).toBe("shell");
    expect(process.env.SITEWRIGHT_TEST_UNSET).toBe("file");
  });
});
