import {
  designApply,
  localeAdd,
  localesList,
  pagesCreate,
  pagesDelete,
  pagesDuplicate,
  publishPreview,
  referenceScreenshot,
} from "@sitewright/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fetchScreenshotImage } from "../../src/assets/screenshot-image.ts";
import { MAX_IMAGE_SIDE_PX } from "../../src/constants/mcp.ts";
import type { TransportRouter } from "../../src/transports/router.ts";
import { createIntegrationTransports, integrationConfig, TEST_PREFIX } from "./helpers.ts";

const config = integrationConfig();
const SOURCE = `/${TEST_PREFIX}-source`;
const COPY = `/${TEST_PREFIX}-copy`;

describe.skipIf(config === null)("page copies, locales, the publish preview and web screenshots on the sandbox", () => {
  let transports: TransportRouter;

  beforeAll(async () => {
    if (config !== null) {
      transports = await createIntegrationTransports(config);
    }
  });

  afterAll(async () => {
    for (const path of [COPY, SOURCE]) {
      await transports.run(pagesDelete, { path }).catch(() => undefined);
    }

    await transports.close();
  });

  it("copies a page with its breakpoints and content to a free path, as a draft", async () => {
    for (const path of [COPY, SOURCE]) {
      await transports.run(pagesDelete, { path }).catch(() => undefined);
    }

    const source = await transports.run(pagesCreate, { path: SOURCE });
    const breakpoints = await transports.withServerApi(async (runtime) => runtime.port.getChildren(source.id));
    const primary = breakpoints.find((child) => child.isPrimaryBreakpoint) ?? breakpoints[0];

    await transports.run(designApply, {
      pagePath: SOURCE,
      xml: `<RichTextNode parent="${primary?.id}">${TEST_PREFIX} copy me</RichTextNode>`,
    });

    await expect(
      transports.run(pagesDuplicate, {
        path: SOURCE,
        newPath: SOURCE,
      }),
    ).rejects.toThrow(/already/);

    const copy = await transports.run(pagesDuplicate, {
      path: SOURCE,
      newPath: COPY,
    });

    expect(copy).toMatchObject({
      kind: "web",
      path: COPY,
      draft: true,
    });
    expect(await transports.withServerApi(async (runtime) => (await runtime.port.getChildren(copy.id)).length)).toBe(
      breakpoints.length,
    );
  });

  it("previews a publish without publishing", async () => {
    const preview = await transports.run(publishPreview, {});

    expect(typeof preview.status).toBe("string");
    expect(Object.keys(preview.urls).length).toBeGreaterThan(0);
    expect(preview.changes.length).toBeLessThanOrEqual(preview.totalChanges);
  });

  it("screenshots a public page whole, and fetches it at a size the model takes", async () => {
    const shot = await transports.run(referenceScreenshot, {
      url: "https://example.com",
      width: 390,
    });

    expect(shot.imageUrl).toMatch(/^https:\/\/framerusercontent\.com\//);

    const image = await fetchScreenshotImage(shot.imageUrl);

    expect(image.size?.width).toBe(390);
    expect(Math.max(image.shown?.width ?? 0, image.shown?.height ?? 0)).toBeLessThanOrEqual(MAX_IMAGE_SIDE_PX);
  });

  it("checks a new locale against Framer's languages and the site's locales before adding it", async () => {
    await expect(transports.run(localeAdd, { language: "Klingon" })).rejects.toThrow(/nl \(Dutch\)/);

    const primary = (await transports.run(localesList, {})).locales.find((locale) => locale.default);

    await expect(transports.run(localeAdd, { language: primary?.code ?? "" })).rejects.toThrow(/already/);
  });
});
