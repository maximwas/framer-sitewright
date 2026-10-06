import {
  breakpointsAdd,
  deploymentsList,
  designApply,
  HistoryRecorder,
  historyRevert,
  nodesFind,
  pagesCreate,
  pagesDelete,
  publishStatus,
  redirectsList,
  redirectsSet,
  requireAgent,
  siteSettingsGet,
  siteSettingsSet,
  textReplace,
} from "@sitewright/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TransportRouter } from "../../src/transports/router.ts";
import { createIntegrationTransports, integrationConfig, TEST_PREFIX } from "./helpers.ts";

const config = integrationConfig();
const PAGE = `/${TEST_PREFIX}-page`;
const SETTINGS_PAGE = `/${TEST_PREFIX}-settings`;

describe.skipIf(config === null)("pages, find and replace, redirects and publishing on the sandbox project", () => {
  let transports: TransportRouter;

  beforeAll(async () => {
    if (config !== null) {
      transports = await createIntegrationTransports(config);
    }
  });

  afterAll(async () => {
    await transports.run(pagesDelete, { path: PAGE }).catch(() => undefined);
    await transports.run(pagesDelete, { path: SETTINGS_PAGE }).catch(() => undefined);
    await transports.close();
  });

  /** A rich text's runs as serialize() reads them: text and formatting. */
  const runsOf = (id: string) =>
    transports.withServerApi(async (runtime) => {
      const runs: unknown[] = [];
      const collect = (value: unknown) => {
        const node = value as { type?: unknown; attributes?: unknown; children?: unknown };

        if (node.type === "TextRun") {
          runs.push(node.attributes);
        }

        for (const child of Array.isArray(node.children) ? node.children : []) {
          collect(child);
        }
      };

      collect(
        await requireAgent(runtime).serialize(
          {
            id,
            depth: 4,
          },
          { pagePath: PAGE },
        ),
      );

      return runs;
    });

  it("replaces a text in place keeping its bold word, in a breakpoint copy's own text too, and undoes both", async () => {
    await transports.run(pagesDelete, { path: PAGE }).catch(() => undefined);

    const page = await transports.run(pagesCreate, { path: PAGE });
    const root = await transports.withServerApi(async (runtime) => runtime.port.getChildren(page.id));
    const primary = root.find((child) => child.isPrimaryBreakpoint) ?? root[0];

    expect(primary).toBeDefined();

    const applied = await transports.run(designApply, {
      pagePath: PAGE,
      xml: `<RichTextNode key="text" parent="${primary?.id}"><TextBlock tag="p">${TEST_PREFIX} say <TextRun bold="true">hello</TextRun> world</TextBlock></RichTextNode>`,
    });

    expect(applied.ok).toBe(true);

    const textId = applied.keys?.["text"] ?? "";
    const { breakpoints } = await transports.run(breakpointsAdd, {
      pagePath: PAGE,
      breakpoints: [
        {
          name: "Tablet",
          width: 810,
        },
      ],
    });
    const copyId = `${breakpoints.find((breakpoint) => breakpoint.name === "Tablet")?.id}${textId}`;
    const override = await transports.run(designApply, {
      pagePath: PAGE,
      xml: `<RichTextNode id="${copyId}">${TEST_PREFIX} tablet hello</RichTextNode>`,
    });

    expect(override.ok).toBe(true);
    expect(
      (
        await transports.run(nodesFind, {
          query: `${TEST_PREFIX} say`,
          pagePath: PAGE,
        })
      ).matches,
    ).toHaveLength(1);

    const input = {
      find: "Hello",
      replace: "goodbye",
      pagePath: PAGE,
    };
    const preview = await transports.run(textReplace, {
      ...input,
      dryRun: true,
    });

    expect(preview.changes).toEqual([
      {
        id: textId,
        page: PAGE,
        breakpoint: null,
        before: `${TEST_PREFIX} say hello world`,
        after: `${TEST_PREFIX} say goodbye world`,
        formatting: "kept",
      },
      {
        id: copyId,
        page: PAGE,
        breakpoint: "Tablet",
        before: `${TEST_PREFIX} tablet hello`,
        after: `${TEST_PREFIX} tablet goodbye`,
        formatting: "kept",
      },
    ]);

    const history = new HistoryRecorder();
    const replaced = await transports.run(textReplace, input, { history });

    expect(replaced).toMatchObject({
      replaced: 2,
      failed: [],
    });
    expect(history.incomplete).toBeNull();
    expect(await runsOf(textId)).toEqual([
      { text: `${TEST_PREFIX} say ` },
      {
        text: "goodbye",
        bold: true,
      },
      { text: " world" },
    ]);
    expect(await runsOf(copyId)).toEqual([{ text: `${TEST_PREFIX} tablet goodbye` }]);

    const undone = await transports.run(historyRevert, { steps: [...history.steps] });

    expect(undone.results.map(({ outcome, note }) => [outcome, note])).toEqual([
      ["restored", null],
      ["restored", null],
    ]);
    expect(await runsOf(textId)).toEqual([
      { text: `${TEST_PREFIX} say ` },
      {
        text: "hello",
        bold: true,
      },
      { text: " world" },
    ]);
    expect(await runsOf(copyId)).toEqual([{ text: `${TEST_PREFIX} tablet hello` }]);

    const deleted = await transports.run(pagesDelete, { path: PAGE });

    expect(deleted.kind).toBe("web");
  });

  it("sets a page's and the site's settings in one call, reports an image Framer cannot download, and undoes them", async () => {
    await transports.run(pagesDelete, { path: SETTINGS_PAGE }).catch(() => undefined);
    await transports.run(pagesCreate, { path: SETTINGS_PAGE });

    const pageOf = async () =>
      (await transports.run(siteSettingsGet, { pagePath: SETTINGS_PAGE })).pages.find(
        ({ path }) => path === SETTINGS_PAGE,
      );
    const before = await transports.run(siteSettingsGet, {});
    const initial = await pageOf();

    expect(initial).toMatchObject({
      draft: false,
      metadata: {
        title: null,
        noIndex: false,
        noIndexSite: false,
      },
      layoutTemplate: "default",
    });

    // Framer sets everything but the image it cannot download, then throws: the journal still holds the title.
    const partial = new HistoryRecorder();
    const refused = await transports.run(
      siteSettingsSet,
      {
        pages: [
          {
            path: SETTINGS_PAGE,
            title: `${TEST_PREFIX} refused`,
            socialImage: "https://example.com/sitewright-missing-image-404.png",
          },
        ],
      },
      { history: partial },
    );

    expect(refused).toMatchObject({
      ok: false,
      message: expect.stringMatching(/applied the rest of the batch/),
      pages: [
        {
          metadata: {
            title: `${TEST_PREFIX} refused`,
            socialImage: null,
          },
        },
      ],
    });
    expect(refused.errors.map(({ message }) => message).join(" ")).toMatch(/could not download/);

    await transports.run(historyRevert, { steps: [...partial.steps] });

    expect(await pageOf()).toEqual(initial);

    // The site's own favicon as its social image: a URL Framer can download, and the root has none (or gets it back).
    const image = before.site?.favicon ?? null;
    const history = new HistoryRecorder();
    const set = await transports.run(
      siteSettingsSet,
      {
        ...(image === null ? {} : { site: { socialImage: image } }),
        pages: [
          {
            path: SETTINGS_PAGE,
            title: `${TEST_PREFIX} settings`,
            description: "A page the integration tests set and undo.",
            noIndex: true,
            draft: true,
            layoutTemplate: null,
          },
        ],
      },
      { history },
    );

    expect(set).toMatchObject({
      ok: true,
      pages: [
        {
          path: SETTINGS_PAGE,
          draft: true,
          metadata: {
            title: `${TEST_PREFIX} settings`,
            noIndex: true,
            noIndexSite: true,
          },
          layoutTemplate: null,
        },
      ],
    });
    expect(history.incomplete).toBeNull();

    const undone = await transports.run(historyRevert, { steps: [...history.steps] });

    expect(undone.results.every(({ outcome, note }) => outcome === "restored" && note === null)).toBe(true);
    expect(await pageOf()).toEqual(initial);
    expect((await transports.run(siteSettingsGet, {})).site).toEqual(before.site);

    await transports.run(pagesDelete, { path: SETTINGS_PAGE });
  });

  it("reads where the site is published and its deployments", async () => {
    const status = await transports.run(publishStatus, {});

    expect(status).toHaveProperty("production");

    const { deployments } = await transports.run(deploymentsList, { limit: 3 });

    expect(deployments.length).toBeLessThanOrEqual(3);
  });

  it("adds and removes a redirect, where the plan allows redirects", async () => {
    const from = `/${TEST_PREFIX}-old`;

    try {
      await transports.run(redirectsSet, {
        set: [
          {
            from,
            to: "/",
          },
        ],
      });
    } catch (error) {
      // A free plan has no redirects: Framer says so, and that is all this sandbox can show.
      expect(String(error)).toMatch(/plan|upgrade|redirect/i);

      return;
    }

    expect((await transports.run(redirectsList, {})).redirects.map((redirect) => redirect.from)).toContain(from);

    const removed = await transports.run(redirectsSet, { remove: [from] });

    expect(removed.removed).toEqual([from]);
  });
});
