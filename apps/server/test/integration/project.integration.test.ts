import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  codeFilesList,
  componentsRead,
  customCodeGet,
  designApply,
  iconsSearch,
  imagesSearch,
  imageUpload,
  nodesRead,
  projectCapabilities,
  projectOverview,
  requireAgent,
  requireScreenshot,
} from "@sitewright/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { imageSourceOf } from "../../src/assets/image-source.ts";
import { DocsCache } from "../../src/docs/docs-cache.ts";
import { guideNames, readGuide, resolveGuideName } from "../../src/docs/guides.ts";
import type { TransportRouter } from "../../src/transports/router.ts";
import { createIntegrationTransports, integrationConfig, TEST_PREFIX } from "./helpers.ts";

const config = integrationConfig();

describe.skipIf(config === null)("project reads on the sandbox project", () => {
  let transports: TransportRouter;

  beforeAll(async () => {
    if (config !== null) {
      transports = await createIntegrationTransports(config);
    }
  });

  afterAll(async () => {
    await transports.close();
  });

  it("lists the home page", async () => {
    const overview = await transports.run(projectOverview, {});

    expect(overview.transport).toBe("server-api");
    expect(overview.pages.some((page) => page.path === "/")).toBe(true);
  });

  it("tells the plan apart through branch access", async () => {
    const probe = await transports.run(projectCapabilities, {});

    expect(probe.detail).toBeNull();
    expect(["available", "unavailable"]).toContain(probe.branches);
  });

  it("reads the home page tree and screenshots its first breakpoint", async () => {
    const read = await transports.run(nodesRead, {
      pagePath: "/",
      depth: 1,
      attributes: [],
      format: "json",
    });
    const firstChild = (read.node as { children?: { id: string }[] }).children?.[0];

    expect(firstChild?.id).toBeTruthy();

    const shot = await transports.withServerApi((runtime) =>
      requireScreenshot(runtime)(firstChild?.id ?? "", {
        format: "png",
        scale: 1,
      }),
    );

    expect([...shot.data.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("applies raw DSL with diagnostics and cleans up", async () => {
    const created = await transports.run(designApply, {
      dsl: `+ColorStyleTokenNode tmp name="${TEST_PREFIX}/raw" light="#000000";`,
    });

    expect(created.ok).toBe(true);

    const id = created.renamedIds.tmp ?? "";
    const removed = await transports.run(designApply, { dsl: `DEL ${id};` });

    expect(removed.ok).toBe(true);
  });

  it("finds photos and icons, uploads an SVG, reads components and code", async () => {
    const photos = await transports.run(imagesSearch, {
      query: "white ceramic vases",
      count: 2,
      width: 800,
    });

    expect(photos.images.length).toBeGreaterThan(0);
    expect(photos.images[0]?.url).toMatch(/^https:\/\/images\.unsplash\.com\//);

    const uploaded = await transports.run(imageUpload, {
      image: await imageSourceOf({
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="#2B3BFF"/></svg>',
      }),
      name: `${TEST_PREFIX}-dot.svg`,
    });

    expect(uploaded.url).toMatch(/^https:\/\/framerusercontent\.com\/images\/.+\.svg$/);

    const icons = await transports.run(iconsSearch, {
      query: "arrow right",
      set: "Phosphor",
    });

    expect(icons.matches[0]?.icons).toContain("Arrow Right");

    const components = await transports.run(componentsRead, {});

    expect(Array.isArray(components.components)).toBe(true);
    expect(Array.isArray(components.codeComponents)).toBe(true);
    expect((await transports.run(customCodeGet, {})).locations).toHaveLength(4);
    expect(Array.isArray((await transports.run(codeFilesList, {})).files)).toBe(true);
  });

  it("loads the live DSL reference and an implementation guide it lists", async () => {
    const docs = new DocsCache({
      cacheDir: await mkdtemp(join(tmpdir(), "sitewright-docs-")),
      apiVersion: "live",
    });
    const sections = await docs.getSections(() =>
      transports.withServerApi((runtime) => requireAgent(runtime).getSystemPrompt()),
    );

    expect(sections.some((section) => section.title === "Updating the Project")).toBe(true);

    const faq = await transports.withServerApi((runtime) =>
      readGuide(runtime, resolveGuideName(guideNames(sections), "faq")),
    );

    // The recipe the reference lacks: a closed accordion item is a fixed height that clips, not a hidden answer.
    expect(faq).toContain("Closed");
    expect(faq).toContain("flowEffect");
  });
});
