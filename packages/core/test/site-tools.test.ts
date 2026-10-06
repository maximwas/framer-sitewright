import { expect, it } from "vitest";
import { runOperation } from "../src/operations/define.ts";
import { nodesFind } from "../src/operations/nodes/find.ts";
import { textReplace } from "../src/operations/nodes/text-replace.ts";
import { pagesCreate, pagesDelete } from "../src/operations/pages/pages.ts";
import { deploymentsList, publishStatus } from "../src/operations/project/publish-status.ts";
import { redirectsList, redirectsSet } from "../src/operations/redirects/redirects.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

const pluginOnly = {
  withAgent: false,
  transport: "plugin",
} as const;

it("creates a page at a free path and deletes it, never the home page", async () => {
  const { runtime, state } = createFakeRuntime({}, pluginOnly);
  const run = { runtime };

  const created = await runOperation(pagesCreate, run, { path: "/about" });

  expect(created).toMatchObject({
    kind: "web",
    path: "/about",
  });
  await expect(runOperation(pagesCreate, run, { path: "/about" })).rejects.toThrow(/already/);

  await runOperation(pagesCreate, run, { designPage: "Moodboard" });
  expect(state.designPages.map(({ name }) => name)).toEqual(["Moodboard"]);

  await runOperation(pagesDelete, run, { path: "/about" });
  expect(state.webPages.map(({ path }) => path)).toEqual(["/"]);
  await expect(runOperation(pagesDelete, run, { path: "/" })).rejects.toThrow(/home page/);
});

it("finds layers by name or text on the primary breakpoint only, and previews a text replacement", async () => {
  const { runtime, state } = createFakeRuntime(
    {
      canvas: [
        {
          id: "hero",
          parentId: "breakpoint-desktop",
          className: "FrameNode",
          name: "Hero",
        },
        {
          id: "title",
          parentId: "hero",
          className: "TextNode",
          name: null,
          text: "Build calm spaces",
        },
        {
          id: "cta",
          parentId: "hero",
          className: "TextNode",
          name: "CTA",
          text: "Book a call",
        },
        // A layer of the tablet copy: the same content as the primary breakpoint's, so it is not listed twice.
        {
          id: "tablet-title",
          parentId: "breakpoint-tablet",
          className: "TextNode",
          name: null,
          text: "Build calm spaces",
        },
      ],
    },
    pluginOnly,
  );
  const run = { runtime };

  const byText = await runOperation(nodesFind, run, { query: "CALM" });

  expect(byText.matches).toEqual([
    {
      id: "title",
      page: "/",
      type: "RichTextNode",
      name: null,
      text: "Build calm spaces",
    },
  ]);

  const texts = await runOperation(nodesFind, run, { type: "RichTextNode" });

  expect(texts.matches.map(({ id }) => id)).toEqual(["title", "cta"]);

  const preview = await runOperation(textReplace, run, {
    find: "call",
    replace: "visit",
    dryRun: true,
  });

  expect(preview).toMatchObject({
    replaced: 0,
    changes: [
      {
        id: "cta",
        page: "/",
        before: "Book a call",
        after: "Book a visit",
      },
    ],
  });
  expect(state.canvas.find(({ id }) => id === "cta")?.text).toBe("Book a call");
});

it("adds, changes and removes redirects by their from path, and returns what was there", async () => {
  const { runtime } = createFakeRuntime({}, pluginOnly);
  const run = { runtime };

  await runOperation(redirectsSet, run, {
    set: [
      {
        from: "/old",
        to: "/new",
      },
    ],
  });

  const changed = await runOperation(redirectsSet, run, {
    set: [
      {
        from: "/old",
        to: "/newer",
      },
      {
        from: "/blog",
        to: "https://blog.example.com",
        allLocales: true,
      },
    ],
    remove: ["/missing"],
  });

  expect(changed).toMatchObject({
    added: ["/blog"],
    updated: ["/old"],
    removed: [],
    missing: ["/missing"],
    previous: [
      {
        from: "/old",
        to: "/new",
        allLocales: false,
      },
    ],
  });

  await runOperation(redirectsSet, run, { remove: ["/old"] });

  expect((await runOperation(redirectsList, run, {})).redirects).toEqual([
    {
      from: "/blog",
      to: "https://blog.example.com",
      allLocales: true,
    },
  ]);
});

it("tells where the site is published, what changed since, and the newest deployments", async () => {
  const { runtime } = createFakeRuntime(
    {
      publishInfo: {
        production: {
          url: "https://studio.framer.website",
          deploymentTime: Date.UTC(2026, 9, 5, 9, 30),
          optimizationStatus: "optimized",
        },
        staging: null,
      },
      unpublishedChanges: [
        {
          nodeId: "page-about",
          path: "/about",
          status: "added",
        },
      ],
      deployments: [
        {
          id: "d2",
          status: "ready",
          createdAt: "2026-10-05T09:30:00Z",
          deployedBy: { name: "Max" },
        },
        {
          id: "d1",
          status: "failed",
          failureStage: "optimizing",
          createdAt: "2026-10-04T09:30:00Z",
          deployedBy: null,
        },
      ],
    },
    pluginOnly,
  );

  expect(await runOperation(publishStatus, { runtime }, {})).toEqual({
    production: {
      url: "https://studio.framer.website",
      publishedAt: "2026-10-05T09:30:00.000Z",
      optimization: "optimized",
    },
    staging: null,
    unpublished: [
      {
        path: "/about",
        status: "added",
      },
    ],
  });

  const { deployments } = await runOperation(deploymentsList, { runtime }, { limit: 1 });

  expect(deployments).toEqual([
    {
      id: "d2",
      status: "ready",
      createdAt: "2026-10-05T09:30:00Z",
      by: "Max",
    },
  ]);
});

it("regression: reads a page's layers a level at a time, not one round trip per layer (seen: text_replace took 123 s)", async () => {
  // 30 sections with a text each. Through the Server API every getChildren is a round trip: walked one layer after
  // another, the page took 61 of them in a row.
  const { runtime } = createFakeRuntime({
    canvas: Array.from({ length: 30 }, (_, i) => [
      {
        id: `section-${i}`,
        parentId: "breakpoint-desktop",
        className: "FrameNode",
        name: `Section ${i}`,
      },
      {
        id: `text-${i}`,
        parentId: `section-${i}`,
        className: "TextNode",
        name: null,
        text: i === 29 ? "Book a call" : `Line ${i}`,
      },
    ]).flat(),
  });
  // Calls wait for the next round, which answers every call in flight at once.
  const waiting: (() => void)[] = [];
  const slow = {
    ...runtime,
    port: {
      ...runtime.port,
      getChildren: (nodeId: string) =>
        new Promise<Awaited<ReturnType<typeof runtime.port.getChildren>>>((resolve) =>
          waiting.push(() => void runtime.port.getChildren(nodeId).then(resolve)),
        ),
    },
  };
  const roundsOf = async <T>(work: Promise<T>): Promise<{ result: T; rounds: number }> => {
    let done = false;
    const finished = work.finally(() => {
      done = true;
    });
    let rounds = 0;

    while (!done && rounds < 200) {
      for (let i = 0; i < 50; i += 1) {
        await Promise.resolve();
      }

      const round = waiting.splice(0);

      if (round.length > 0) {
        rounds += 1;

        for (const answer of round) {
          answer();
        }
      }
    }

    return {
      result: await finished,
      rounds,
    };
  };

  const found = await roundsOf(
    runOperation(
      nodesFind,
      { runtime: slow },
      {
        type: "RichTextNode",
        limit: 200,
      },
    ),
  );

  expect(found.rounds).toBeLessThan(12);
  expect(found.result.matches.map(({ id }) => id)).toEqual(Array.from({ length: 30 }, (_, i) => `text-${i}`));

  const preview = await roundsOf(
    runOperation(
      textReplace,
      { runtime: slow },
      {
        find: "call",
        replace: "visit",
        dryRun: true,
      },
    ),
  );

  expect(preview.rounds).toBeLessThan(12);
  expect(preview.result.changes.map(({ id }) => id)).toEqual(["text-29"]);
});

it('regression: finds layers when a non-text layer\'s getText throws (seen live: "Node is not a text node")', async () => {
  const { runtime } = createFakeRuntime({
    canvas: [
      {
        id: "card",
        parentId: "breakpoint-desktop",
        className: "FrameNode",
        name: "Card",
      },
      {
        id: "title",
        parentId: "card",
        className: "TextNode",
        name: null,
        text: "Book a call",
      },
    ],
  });
  const strict = {
    ...runtime,
    port: {
      ...runtime.port,
      getChildren: async (nodeId: string) =>
        (await runtime.port.getChildren(nodeId)).map((child) =>
          (child as { id: string }).id === "card"
            ? {
                ...child,
                getText: () => Promise.reject(new Error("Node is not a text node")),
              }
            : child,
        ),
    },
  };
  const found = await runOperation(nodesFind, { runtime: strict }, { query: "book" });

  expect(found.matches.map(({ id }) => id)).toEqual(["title"]);
});
