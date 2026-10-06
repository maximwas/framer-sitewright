import { expect, it } from "vitest";
import { HistoryRecorder } from "../src/history/recorder.ts";
import { runOperation } from "../src/operations/define.ts";
import { pagesDuplicate } from "../src/operations/pages/pages.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

function fakeProject() {
  return createFakeRuntime(
    {
      webPages: [
        {
          id: "page-home",
          path: "/",
          draft: false,
          collectionId: null,
        },
        {
          id: "page-about",
          path: "/about",
          draft: false,
          collectionId: null,
        },
      ],
      designPages: [
        {
          id: "design-mood",
          name: "Moodboard",
        },
      ],
    },
    {
      withAgent: false,
      transport: "plugin",
    },
  );
}

it("copies a web page to a free path as a draft, and tells the journal undo cannot remove it", async () => {
  const { runtime, state } = fakeProject();
  const history = new HistoryRecorder();

  const copy = await runOperation(
    pagesDuplicate,
    {
      runtime,
      history,
    },
    {
      path: "/about",
      newPath: "/about-b",
    },
  );

  expect(copy).toMatchObject({
    kind: "web",
    path: "/about-b",
    name: null,
    draft: true,
    from: "/about",
  });
  expect(state.webPages.map(({ path, draft }) => [path, draft])).toEqual([
    ["/", false],
    ["/about", false],
    ["/about-b", true],
  ]);
  expect(history.incomplete).toMatch(/page_delete/);
});

it("regression: a copy of a published page is a draft unless asked otherwise, though Framer's copy keeps its state", async () => {
  const { runtime, state } = fakeProject();

  await runOperation(
    pagesDuplicate,
    { runtime },
    {
      path: "/about",
      newPath: "/about-draft",
    },
  );
  await runOperation(
    pagesDuplicate,
    { runtime },
    {
      path: "/about",
      newPath: "/about-live",
      draft: false,
    },
  );

  expect(state.webPages.slice(2).map(({ path, draft }) => [path, draft])).toEqual([
    ["/about-draft", true],
    ["/about-live", false],
  ]);
});

it("refuses a path another page has, which Framer would silently rename, and a source that does not exist", async () => {
  const { runtime, state } = fakeProject();

  await expect(
    runOperation(
      pagesDuplicate,
      { runtime },
      {
        path: "/",
        newPath: "/about",
      },
    ),
  ).rejects.toThrow(/already/);
  // Framer stores "/About" as "/about": that spelling is taken too.
  await expect(
    runOperation(
      pagesDuplicate,
      { runtime },
      {
        path: "/",
        newPath: "/About",
      },
    ),
  ).rejects.toThrow(/already/);
  await expect(
    runOperation(
      pagesDuplicate,
      { runtime },
      {
        path: "/missing",
        newPath: "/x",
      },
    ),
  ).rejects.toThrow(/No page/);
  await expect(runOperation(pagesDuplicate, { runtime }, { path: "/about" })).rejects.toThrow(/newPath/);
  expect(state.webPages).toHaveLength(2);
});

it("copies a design page under a new name", async () => {
  const { runtime, state } = fakeProject();

  const copy = await runOperation(
    pagesDuplicate,
    { runtime },
    {
      designPage: "Moodboard",
      newName: "Moodboard v2",
    },
  );

  expect(copy).toMatchObject({
    kind: "design",
    path: null,
    name: "Moodboard v2",
    draft: null,
    from: "Moodboard",
  });
  expect(state.designPages.map(({ name }) => name)).toEqual(["Moodboard", "Moodboard v2"]);
});
