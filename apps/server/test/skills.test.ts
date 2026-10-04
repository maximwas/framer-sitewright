import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { expect, it, vi } from "vitest";
import { runHook } from "../src/cli/run-hook.ts";
import { listActivity } from "../src/history/activity-api.ts";
import { ActivityJournal } from "../src/history/activity-journal.ts";
import { JournalStore } from "../src/history/journal-store.ts";
import { createLogger } from "../src/logging/logger.ts";
import { SkillInbox } from "../src/skills/skill-inbox.ts";
import type { SkillNote } from "../src/types/skills.ts";
import type { OperationRunner, ProjectRef } from "../src/types/transports.ts";
import { mergeHookSettings } from "../src/utils/hook-settings.ts";
import { skillNoteOf } from "../src/utils/skill-note.ts";

const at = "2026-10-04T10:00:00.000Z";

/** What Claude Code sends a PostToolUse hook (the Skill shape is taken from a real session transcript). */
const hookInput = (tool_name: string, tool_input: Record<string, unknown>, session_id = "session-1") => ({
  session_id,
  transcript_path: "/tmp/transcript.jsonl",
  cwd: "/tmp",
  hook_event_name: "PostToolUse",
  tool_name,
  tool_input,
  tool_response: "…",
});

it("turns a skill activation or a read of a skill's file into a note, and nothing else", () => {
  expect(
    skillNoteOf(
      hookInput("Skill", {
        skill: "superpowers:writing-plans",
        args: "a long prompt",
      }),
      at,
    ),
  ).toEqual({
    at,
    skill: "superpowers:writing-plans",
    reference: null,
  });
  expect(
    skillNoteOf(hookInput("Read", { file_path: "/Users/me/.claude/skills/framer-craft/references/motion.md" }), at),
  ).toEqual({
    at,
    skill: "framer-craft",
    reference: "motion.md",
  });
  expect(skillNoteOf(hookInput("Read", { file_path: "/Users/me/.claude/skills/framer/SKILL.md" }), at)).toEqual({
    at,
    skill: "framer",
    reference: null,
  });
  expect(skillNoteOf(hookInput("Read", { file_path: "/Users/me/project/src/app.ts" }), at)).toBeNull();
  expect(skillNoteOf(hookInput("Read", { file_path: "/Users/me/skills/notes.md" }), at)).toBeNull();
  expect(skillNoteOf(hookInput("Bash", { command: "ls" }), at)).toBeNull();
});

it("the hook hands a note to the inbox of its own session only", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sitewright-skills-"));
  const mine: SkillNote[] = [];
  const others: SkillNote[] = [];
  const inbox = SkillInbox.open(dir, "session-1", (note) => mine.push(note));
  const other = SkillInbox.open(dir, "session-2", (note) => others.push(note));
  const hook = (input: unknown) => runHook(Readable.from([JSON.stringify(input)]), dir, new Date(at));

  await hook(hookInput("Skill", { skill: "framer-craft" }));
  await hook(hookInput("Read", { file_path: "/x/skills/framer-craft/references/layout.md" }));
  await hook(hookInput("Read", { file_path: "/x/src/index.ts" }));
  await inbox.drain();
  await other.drain();

  expect(mine.map((note) => note.reference)).toEqual([null, "layout.md"]);
  expect(others).toEqual([]);

  // A closed session leaves no file behind, and a later hook for it writes nowhere.
  inbox.close();
  other.close();
  await hook(hookInput("Skill", { skill: "framer-craft" }));
  expect(await readdir(dir)).toEqual([]);
});

it("a skill noted before the session knows its project waits, then goes in before the session's first entry", async () => {
  let project: ProjectRef | null = null;
  const transports = {
    run: async () => project,
    status: () => ({
      mode: "auto",
      active: "server-api",
      transports: [
        {
          transport: "server-api",
          configured: true,
          connected: project !== null,
          project,
          hint: null,
        },
      ],
      hint: null,
    }),
  } as unknown as OperationRunner;
  const journal = new ActivityJournal({
    store: new JournalStore(await mkdtemp(join(tmpdir(), "sitewright-journal-"))),
    transports,
    logger: createLogger("silent"),
    now: () => Date.parse(at),
  });
  const appended = vi.fn();

  journal.on("appended", appended);
  await journal.noteSkill({
    at,
    skill: "framer-craft",
    reference: "motion.md",
  });
  expect(appended).not.toHaveBeenCalled();

  project = {
    id: "project-1",
    name: "Sandbox",
  };
  await journal.checkpoint("Start", "ai");

  const { entries } = await listActivity(journal, {
    limit: 10,
    show: "skills",
  });

  expect(entries).toMatchObject([
    {
      kind: "skill",
      title: "Skill: framer-craft",
      detail: { subject: "motion.md" },
    },
  ]);
  expect((await journal.entries("project-1")).map((entry) => entry.kind)).toEqual(["skill", "checkpoint"]);
});

it("setup --hooks adds the hooks once and keeps the rest of the settings", () => {
  const existing = {
    model: "opus",
    hooks: {
      PostToolUse: [
        {
          matcher: "Edit",
          hooks: [
            {
              type: "command",
              command: "prettier --write",
            },
          ],
        },
      ],
    },
  };
  const first = mergeHookSettings(existing, "sitewright hook");
  const second = mergeHookSettings(first.settings, "sitewright hook");

  expect(first.changed).toBe(true);
  expect(first.settings).toMatchObject({
    model: "opus",
    hooks: {
      PostToolUse: [
        { matcher: "Edit" },
        {
          matcher: "Skill",
          hooks: [
            {
              command: "sitewright hook",
              async: true,
            },
          ],
        },
        {
          matcher: "Read",
          hooks: [
            {
              command: "sitewright hook",
              if: "Read(//**/skills/**)",
            },
          ],
        },
      ],
    },
  });
  expect(second.changed).toBe(false);
  expect(second.settings).toEqual(first.settings);
  expect(() => mergeHookSettings([], "sitewright hook")).toThrow();
});
