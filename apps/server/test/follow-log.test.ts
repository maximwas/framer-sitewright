import { closeSync, mkdtempSync, openSync, writeFileSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { followLog } from "../src/logging/follow-log.ts";

const record = (msg: string) =>
  JSON.stringify({
    level: 30,
    time: Date.now(),
    pid: 4242,
    name: "sitewright",
    msg,
  });

/** Waits until a printed line has the text, or 3 s pass. */
async function until(printed: readonly string[], text: string): Promise<void> {
  for (const deadline = Date.now() + 3_000; !printed.some((line) => line.includes(text)) && Date.now() < deadline; ) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

describe("sitewright logs", () => {
  it("prints what a server writes through its open log file, which a folder watch on macOS does not report", async () => {
    const file = join(mkdtempSync(join(tmpdir(), "sw-follow-")), "sitewright.log");
    const printed: string[] = [];
    const stop = new AbortController();

    writeFileSync(file, `${record("sitewright ready")}\n`);

    const following = followLog(file, (line) => printed.push(line), stop.signal);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // A server's logger keeps the file open and writes through it.
    const writer = openSync(file, "a");

    writeSync(writer, `${record("tool nodes_read")}\n`);
    await until(printed, "tool nodes_read");
    stop.abort();
    await following;
    closeSync(writer);

    expect(printed[0]).toContain("sitewright ready");
    expect(printed.at(-1)).toContain("tool nodes_read");
  });

  it("follows a log whose folder no server has made yet", async () => {
    const file = join(mkdtempSync(join(tmpdir(), "sw-none-")), "logs", "sitewright.log");
    const printed: string[] = [];
    const stop = new AbortController();
    const following = followLog(file, (line) => printed.push(line), stop.signal);

    await new Promise((resolve) => setTimeout(resolve, 100));
    writeFileSync(file, `${record("sitewright ready")}\n`);
    await until(printed, "sitewright ready");
    stop.abort();
    await following;

    expect(printed.at(-1)).toContain("sitewright ready");
  });
});
