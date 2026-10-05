import {
  deploymentsList,
  designApply,
  nodesFind,
  pagesCreate,
  pagesDelete,
  publishStatus,
  redirectsList,
  redirectsSet,
  textReplace,
} from "@sitewright/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TransportRouter } from "../../src/transports/router.ts";
import { createIntegrationTransports, integrationConfig, TEST_PREFIX } from "./helpers.ts";

const config = integrationConfig();
const PAGE = `/${TEST_PREFIX}-page`;

describe.skipIf(config === null)("pages, find and replace, redirects and publishing on the sandbox project", () => {
  let transports: TransportRouter;

  beforeAll(async () => {
    if (config !== null) {
      transports = await createIntegrationTransports(config);
    }
  });

  afterAll(async () => {
    await transports.run(pagesDelete, { path: PAGE }).catch(() => undefined);
    await transports.close();
  });

  it("creates a page, finds a text on it, replaces it with undo in the journal, and deletes the page", async () => {
    await transports.run(pagesDelete, { path: PAGE }).catch(() => undefined);

    const page = await transports.run(pagesCreate, { path: PAGE });
    const root = await transports.withServerApi(async (runtime) => runtime.port.getChildren(page.id));
    const primary = root.find((child) => child.isPrimaryBreakpoint) ?? root[0];

    expect(primary).toBeDefined();

    const applied = await transports.run(designApply, {
      pagePath: PAGE,
      xml: `<RichTextNode parent="${primary?.id}">${TEST_PREFIX} hello world</RichTextNode>`,
    });

    expect(applied.ok).toBe(true);

    const found = await transports.run(nodesFind, {
      query: `${TEST_PREFIX} hello`,
      pagePath: PAGE,
    });

    expect(found.matches).toHaveLength(1);

    const preview = await transports.run(textReplace, {
      find: "hello",
      replace: "goodbye",
      pagePath: PAGE,
      dryRun: true,
    });

    expect(preview.changes).toEqual([
      expect.objectContaining({
        before: `${TEST_PREFIX} hello world`,
        after: `${TEST_PREFIX} goodbye world`,
      }),
    ]);

    const replaced = await transports.run(textReplace, {
      find: "hello",
      replace: "goodbye",
      pagePath: PAGE,
    });

    expect(replaced).toMatchObject({
      replaced: 1,
      failed: [],
    });
    expect(
      (
        await transports.run(nodesFind, {
          query: "goodbye",
          pagePath: PAGE,
        })
      ).matches,
    ).toHaveLength(1);

    const deleted = await transports.run(pagesDelete, { path: PAGE });

    expect(deleted.kind).toBe("web");
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
