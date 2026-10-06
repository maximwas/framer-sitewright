import { expect, it } from "vitest";
import { HistoryRecorder } from "../src/history/recorder.ts";
import { runOperation } from "../src/operations/define.ts";
import { historyRevert } from "../src/operations/history/revert.ts";
import { siteSettingsGet, siteSettingsSet } from "../src/operations/site/settings.ts";
import { createFakeRuntime } from "../src/testing/index.ts";
import type { FakeFramerState } from "../src/types/testing.ts";

// Shaped like live serialize() output on the sandbox (06.10.2026): metadata nests, unset values are left out.
const project = (): Partial<FakeFramerState> => ({
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
  serializedNodes: {
    rootNode: {
      type: "RootNode",
      id: "rootNode",
      attributes: {
        metadata: {
          title: "Studio Calm",
          description: "Interiors for quiet homes.",
          favicon: "https://framerusercontent.com/images/mark.svg",
        },
      },
    },
    "page-home": {
      type: "WebPageNode",
      id: "page-home",
      name: "Home",
      attributes: { path: "/" },
    },
    "page-about": {
      type: "WebPageNode",
      id: "page-about",
      name: "About",
      attributes: {
        layoutTemplate: "null",
        metadata: {
          title: "About the studio",
          noIndex: true,
          noIndexSite: true,
        },
        path: "/about",
      },
    },
    "template-main": {
      type: "LayoutTemplateNode",
      id: "template-main",
      name: "Main",
      attributes: {},
    },
  },
});

it("reads the site's and each page's settings in one place, as Framer keeps them", async () => {
  const { runtime } = createFakeRuntime(project());

  expect(await runOperation(siteSettingsGet, { runtime }, {})).toEqual({
    site: {
      title: "Studio Calm",
      description: "Interiors for quiet homes.",
      socialImage: null,
      favicon: "https://framerusercontent.com/images/mark.svg",
      faviconDark: null,
      appleTouchIcon: null,
    },
    pages: [
      {
        path: "/",
        id: "page-home",
        draft: false,
        collectionId: null,
        metadata: {
          title: null,
          description: null,
          socialImage: null,
          noIndex: false,
          noIndexSite: false,
        },
        layoutTemplate: "default",
      },
      {
        path: "/about",
        id: "page-about",
        draft: false,
        collectionId: null,
        metadata: {
          title: "About the studio",
          description: null,
          socialImage: null,
          noIndex: true,
          noIndexSite: true,
        },
        layoutTemplate: null,
      },
    ],
    layoutTemplates: [
      {
        id: "template-main",
        name: "Main",
      },
    ],
    note: null,
  });
});

it("without a key lists the pages with their drafts, and says the rest needs the key", async () => {
  const { runtime } = createFakeRuntime(project(), {
    withAgent: false,
    transport: "plugin",
  });
  const settings = await runOperation(siteSettingsGet, { runtime }, { pagePath: "/about" });

  expect(settings).toMatchObject({
    site: null,
    pages: [
      {
        path: "/about",
        draft: false,
        metadata: null,
        layoutTemplate: null,
      },
    ],
  });
  expect(settings.note).toMatch(/Server API key/);
  await expect(runOperation(siteSettingsSet, { runtime }, { site: { title: "Studio" } })).rejects.toThrow(
    /Server API key/,
  );
});

it("sets the site and pages in one quoted batch, noIndexSite with noIndex, and undo brings every value back", async () => {
  const { runtime, state } = createFakeRuntime(project());
  const history = new HistoryRecorder();

  await expect(
    runOperation(
      siteSettingsSet,
      { runtime },
      {
        pages: [
          {
            path: "/missing",
            draft: false,
          },
        ],
      },
    ),
  ).rejects.toThrow(/No web page/);

  const result = await runOperation(
    siteSettingsSet,
    {
      runtime,
      history,
    },
    {
      site: {
        title: 'Studio "Calm"',
        socialImage: "https://framerusercontent.com/images/hero.png",
      },
      pages: [
        {
          path: "/",
          title: "Home | Studio Calm",
        },
        {
          path: "/about",
          title: null,
          noIndex: false,
          draft: true,
          layoutTemplate: "default",
        },
      ],
    },
  );

  // Booleans go quoted: an unquoted one is applied, but the journal cannot read it back for undo.
  expect(state.appliedDsl).toEqual([
    [
      'SET rootNode metadata.title="Studio \\"Calm\\"" metadata.socialImage="https://framerusercontent.com/images/hero.png";',
      'SET page-home metadata.title="Home | Studio Calm";',
      'SET page-about metadata.title="null" metadata.noIndex="false" metadata.noIndexSite="false" layoutTemplate="default" draft="true";',
    ].join("\n"),
  ]);
  expect(result).toMatchObject({
    ok: true,
    site: {
      title: 'Studio "Calm"',
      socialImage: "https://framerusercontent.com/images/hero.png",
    },
    pages: [
      {
        path: "/",
        metadata: { title: "Home | Studio Calm" },
      },
      {
        path: "/about",
        draft: true,
        metadata: {
          title: null,
          noIndex: false,
          noIndexSite: false,
        },
        layoutTemplate: "default",
      },
    ],
  });
  expect(history.incomplete).toBeNull();

  await runOperation(
    historyRevert,
    {
      runtime,
      history: new HistoryRecorder(),
    },
    { steps: [...history.steps] },
  );

  // Regressions: a page without a draft key is published, and one without metadata has none to clear whole; undo
  // wrote draft="null" and metadata="null", which Framer refuses.
  expect(await runOperation(siteSettingsGet, { runtime }, {})).toMatchObject({
    site: {
      title: "Studio Calm",
      socialImage: null,
    },
    pages: [
      {
        path: "/",
        metadata: { title: null },
      },
      {
        path: "/about",
        draft: false,
        metadata: {
          title: "About the studio",
          noIndex: true,
          noIndexSite: true,
        },
        layoutTemplate: null,
      },
    ],
  });
});
