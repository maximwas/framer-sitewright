import { constants } from "node:fs";
import { open, readdir } from "node:fs/promises";
import { join } from "node:path";
import { HOOK_INPUT_MAX_BYTES } from "../constants/skills.ts";
import { HookInputSchema } from "../schemas/skills.ts";
import { inboxPrefix, skillNoteOf } from "../utils/skill-note.ts";

/**
 * The `hook` command: Claude Code runs it after a tool call (PostToolUse) with the call on stdin. A skill activation, or
 * a read of a skill's file, goes to the inboxes of that conversation's sitewright processes (see SkillInbox), which
 * journal it. Anything else is ignored. Never fails and prints nothing: a hook must not get in the AI's way.
 */
export async function runHook(stdin: NodeJS.ReadableStream, inboxDir: string, now = new Date()): Promise<void> {
  try {
    const input = HookInputSchema.safeParse(JSON.parse(await readInput(stdin)));
    const note = input.success ? skillNoteOf(input.data, now.toISOString()) : null;

    if (!input.success || note === null) {
      return;
    }

    const prefix = inboxPrefix(input.data.session_id);
    const inboxes = (await readdir(inboxDir)).filter((name) => name.startsWith(prefix) && name.endsWith(".jsonl"));
    const line = `${JSON.stringify(note)}\n`;

    await Promise.allSettled(inboxes.map((name) => appendIfPresent(join(inboxDir, name), line)));
  } catch {
    // No inbox folder (no session runs sitewright), or input that is not a hook's: nothing to note.
  }
}

async function readInput(stdin: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of stdin) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));

    size += buffer.length;

    if (size > HOOK_INPUT_MAX_BYTES) {
      throw new Error("hook input too large");
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

/** Appends to an inbox only while it exists: a session that closed must not get its file back. */
async function appendIfPresent(file: string, line: string): Promise<void> {
  const handle = await open(file, constants.O_WRONLY | constants.O_APPEND);

  try {
    await handle.appendFile(line);
  } finally {
    await handle.close();
  }
}
