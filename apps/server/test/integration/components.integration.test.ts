import {
  componentDetach,
  componentInsert,
  componentMakeLocal,
  designApply,
  pagesCreate,
  pagesDelete,
  sectionInsert,
} from "@sitewright/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TransportRouter } from "../../src/transports/router.ts";
import { createIntegrationTransports, integrationConfig, TEST_PREFIX } from "./helpers.ts";

const config = integrationConfig();
const PAGE = `/${TEST_PREFIX}-components`;
/** A free Marketplace component designed in Framer, with Desktop, Tablet and Phone variants. */
const FOOTER = "https://framer.com/m/Liquid-Glass-Footer-PpecQS.js@NwnM5wWKuZaTzAqqZTeX";

describe.skipIf(config === null)("component layers on the sandbox project", () => {
  let transports: TransportRouter;
  let componentsBefore = new Set<string>();

  beforeAll(async () => {
    if (config !== null) {
      transports = await createIntegrationTransports(config);
      componentsBefore = new Set(
        (await transports.withServerApi((runtime) => runtime.port.getNodesWithType("ComponentNode"))).map(
          ({ id }) => id,
        ),
      );
    }
  });

  afterAll(async () => {
    await transports.run(pagesDelete, { path: PAGE }).catch(() => undefined);
    // The local copy outlives the page.
    await transports
      .withServerApi(async (runtime) => {
        const added = (await runtime.port.getNodesWithType("ComponentNode")).filter(
          ({ id }) => !componentsBefore.has(id),
        );

        if (added.length > 0) {
          await runtime.port.removeNodes(added.map(({ id }) => id));
        }
      })
      .catch(() => undefined);
    await transports.close();
  });

  it("inserts a section as layers in the flow, makes an instance local after the user's choice and detaches it in place", async () => {
    await transports.run(pagesDelete, { path: PAGE }).catch(() => undefined);

    const page = await transports.run(pagesCreate, { path: PAGE });
    const breakpoints = await transports.withServerApi((runtime) => runtime.port.getChildren(page.id));
    const desktop = breakpoints.find((child) => child.isPrimaryBreakpoint) ?? breakpoints[0];
    const made = await transports.run(designApply, {
      pagePath: PAGE,
      xml: `<FrameNode parent="${desktop?.id}" key="main" name="${TEST_PREFIX} main" layout="stack" stackDirection="vertical" width="100%" height="auto" />`,
    });
    const main = made.keys?.main ?? "";
    const node = (id: string) =>
      transports.withServerApi(async (runtime) => (await runtime.port.getNode(id)) as Record<string, unknown>);

    // Through the Server API Framer drops the layers on the home page's canvas, outside every breakpoint.
    const section = await transports.run(sectionInsert, {
      url: FOOTER,
      parentId: main,
      layout: true,
    });
    const parent = await transports.withServerApi(
      async (runtime) => (await runtime.port.getParent(section.nodeId)) as { id: string },
    );

    expect(parent.id).toBe(main);
    expect(await node(section.nodeId)).toMatchObject({ position: "relative" });
    expect(section.note).toContain("breakpoints");

    const instance = await transports.run(componentInsert, {
      url: FOOTER,
      parentId: main,
    });
    const asked = await transports.run(componentMakeLocal, { nodeId: instance.nodeId });

    expect(asked.status).toBe("needs_confirmation");

    const local = await transports.run(componentMakeLocal, {
      nodeId: instance.nodeId,
      replaceAll: false,
    });

    expect(local.status).toBe("success");
    expect(local.component?.codeFile).toBeNull();

    const placed = await node(instance.nodeId);
    const detached = await transports.run(componentDetach, { nodeId: instance.nodeId });

    expect(detached.note).toBeNull();
    expect(await node(detached.nodeId)).toMatchObject({
      position: placed.position,
      width: placed.width,
    });
  });
});
