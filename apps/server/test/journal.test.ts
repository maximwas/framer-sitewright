import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { designApply } from "@sitewright/core";
import { expect, it } from "vitest";
import { handleActivityCall, listActivity } from "../src/history/activity-api.ts";
import { ActivityJournal } from "../src/history/activity-journal.ts";
import { ActivityUndo } from "../src/history/activity-undo.ts";
import { JournalStore } from "../src/history/journal-store.ts";
import { createLogger } from "../src/logging/logger.ts";
import type { OperationRunner } from "../src/types/transports.ts";

const project = {
  id: "project-1",
  name: "Sandbox",
};

/** Transports that already know the project, as they do once connected. */
const transports = {
  run: async () => project,
  status: () => ({
    mode: "auto",
    active: "server-api",
    transports: [
      {
        transport: "server-api",
        configured: true,
        connected: true,
        project,
        hint: null,
      },
    ],
    hint: null,
  }),
} as unknown as OperationRunner;

it("several Claude Code sessions share one journal: each sees the others' entries, sequence numbers stay unique", async () => {
  const directory = await mkdtemp(join(tmpdir(), "sitewright-journal-"));
  // Two journals over their own stores play two sitewright processes.
  const [first, second] = [0, 1].map(
    () =>
      new ActivityJournal({
        store: new JournalStore(directory),
        transports,
        logger: createLogger("silent"),
      }),
  );

  if (first === undefined || second === undefined) {
    throw new Error("unreachable");
  }

  await first.checkpoint("A", "ai");
  await Promise.all([first.checkpoint("B", "ai"), second.checkpoint("C", "user"), second.checkpoint("D", "ai")]);

  const seen = await first.entries(project.id);

  expect(seen.map((entry) => entry.seq)).toEqual([1, 2, 3, 4]);
  expect(new Set(seen.map((entry) => entry.label))).toEqual(new Set(["A", "B", "C", "D"]));
  expect((await second.entries(project.id)).map((entry) => entry.id)).toEqual(seen.map((entry) => entry.id));

  // Clearing in one session starts the journal over for all of them; the old one stays in the archive.
  expect(await second.clear()).toBe(4);
  expect(await first.entries(project.id)).toEqual([]);
  expect((await first.checkpoint("E", "ai"))?.seq).toBe(1);
  expect(await readdir(join(directory, "archive"))).toHaveLength(1);
});

it("regression: the plugin window lists the journal of the project it is open in, and reverts only this session's", async () => {
  const journal = new ActivityJournal({
    store: new JournalStore(await mkdtemp(join(tmpdir(), "sitewright-journal-"))),
    transports,
    logger: createLogger("silent"),
  });
  const undo = new ActivityUndo(journal);
  const shown = {
    id: "project-2",
    name: "Client site",
  };

  // Another session (configured for a client site) wrote this entry; this one works on the sandbox.
  await journal.checkpoint("Client change", "ai", shown);

  const listed = await handleActivityCall(
    {
      method: "activity.list",
      params: {
        limit: 10,
        show: "changes",
      },
    },
    journal,
    undo,
    "user",
    shown,
  );

  expect(listed).toMatchObject({
    project: shown,
    entries: [{ label: "Client change" }],
  });
  await expect(
    handleActivityCall(
      {
        method: "activity.undo",
        params: {
          dryRun: false,
          onConflict: "skip",
          andLater: false,
        },
      },
      journal,
      undo,
      "user",
      shown,
    ),
  ).rejects.toThrow(/cannot revert there/);
});

it("lists the changes and the reads apart, each within the limit, and keeps what a read looked at", async () => {
  const journal = new ActivityJournal({
    store: new JournalStore(await mkdtemp(join(tmpdir(), "sitewright-journal-"))),
    transports,
    logger: createLogger("silent"),
  });
  const list = (show: "all" | "changes" | "reads") =>
    listActivity(journal, {
      limit: 2,
      show,
    });

  await journal.checkpoint("Start", "ai");

  for (const id of ["a", "b", "c"]) {
    await journal.read(
      "node_screenshot",
      "Screenshot",
      "server-api",
      (result) => ({
        nodes: [
          {
            id,
            name: result ?? id,
          },
        ],
      }),
      async () => id,
    );
  }

  expect(await list("changes")).toMatchObject({ entries: [{ label: "Start" }] });
  expect(await list("reads")).toMatchObject({
    entries: [
      {
        effect: "read",
        detail: { nodes: [{ id: "c" }] },
      },
      { detail: { nodes: [{ id: "b" }] } },
    ],
  });
  expect((await list("all")).entries).toHaveLength(2);
});

it("regression: a session notices a journal another one cleared, even once it has grown past what it read", async () => {
  const directory = await mkdtemp(join(tmpdir(), "sitewright-journal-"));
  const [first, second] = [0, 1].map(
    () =>
      new ActivityJournal({
        store: new JournalStore(directory),
        transports,
        logger: createLogger("silent"),
      }),
  );

  if (first === undefined || second === undefined) {
    throw new Error("unreachable");
  }

  await first.checkpoint("old", "ai");
  expect(await second.entries(project.id)).toHaveLength(1);

  await first.clear();
  await first.checkpoint("new one, longer than the old entry", "ai");
  await first.checkpoint("new two", "ai");

  expect((await second.entries(project.id)).map((entry) => `${entry.seq}:${entry.label}`)).toEqual([
    "1:new one, longer than the old entry",
    "2:new two",
  ]);
});

it("regression: a design_apply whose commands Framer refused is journaled as failed, not ok", async () => {
  const refusing = {
    ...transports,
    run: async () => ({
      ok: false,
      message: "Commands: 1 error.",
      errors: [
        {
          message: "unsupported type object",
          targets: ["carousel"],
        },
      ],
      warnings: [],
      lint: [],
      renamedIds: {},
    }),
    routeOf: () => "server-api",
  } as unknown as OperationRunner;
  const journal = new ActivityJournal({
    store: new JournalStore(await mkdtemp(join(tmpdir(), "sitewright-journal-"))),
    transports: refusing,
    logger: createLogger("silent"),
  });
  const { entry } = await journal.run("design_apply", designApply, { dsl: 'SET carousel $control__dots="{}";' });

  expect(entry).toMatchObject({
    outcome: "failed",
    error: "Commands: 1 error.",
  });
});

it("lists every project with a journal, and opens another project's journal by id", async () => {
  const directory = await mkdtemp(join(tmpdir(), "sitewright-journal-"));
  const journal = new ActivityJournal({
    store: new JournalStore(directory),
    transports,
    logger: createLogger("silent"),
  });
  const client = {
    id: "project-2",
    name: "Client site",
  };

  await journal.checkpoint("Sandbox start", "ai");
  await journal.checkpoint("Client start", "user", client);

  const projects = await journal.projects();

  expect(
    projects
      .map(({ id, name }) => ({
        id,
        name,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  ).toEqual([project, client]);

  const other = await listActivity(
    journal,
    {
      limit: 10,
      show: "changes",
      project: client.id,
    },
    project,
  );

  expect(other.project).toEqual(client);
  expect(other.entries.map((entry) => entry.label)).toEqual(["Client start"]);
});

it("lists the CMS work apart: collection, field and item calls, and the undos of items", async () => {
  const journal = new ActivityJournal({
    store: new JournalStore(await mkdtemp(join(tmpdir(), "sitewright-journal-"))),
    transports,
    logger: createLogger("silent"),
  });
  const entry = (operation: string, title: string) => ({
    durationMs: 1,
    kind: "operation" as const,
    actor: "ai" as const,
    tool: operation.replaceAll(".", "_"),
    operation,
    effect: "write" as const,
    transport: "plugin" as const,
    layer: "plugin-api" as const,
    title,
    outcome: "ok" as const,
    error: null,
    steps: [],
    incomplete: null,
    reverts: [],
    conflicts: 0,
    remap: {},
    label: null,
    detail: null,
  });

  await journal.record(entry("design.apply", "Design: 1 created"));
  await journal.record(entry("cms.items.upsert", "CMS items: 2 created"));
  await journal.record(entry("color.tokens.upsert", "Color tokens: 1 created"));
  await journal.record(entry("cms.collection.create", "CMS collection"));

  const { entries } = await listActivity(journal, {
    limit: 10,
    show: "cms",
  });

  expect(entries.map(({ title }) => title)).toEqual(["CMS collection", "CMS items: 2 created"]);
});
