import { describe, expect, it } from "vitest";
import { NODES_READ_MAX_CHARS } from "../src/constants/nodes.ts";
import { runOperation } from "../src/operations/define.ts";
import { nodesRead } from "../src/operations/nodes/read.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

describe("nodes.read", () => {
  it("regression: names the page a node is on and fills a missing $rect (seen: pagePath / for another page's node, no $rect)", async () => {
    const pages: Record<string, string> = {
      card: "section",
      section: "page-about",
    };
    const { runtime, state } = createFakeRuntime({
      serializedNodes: {
        card: {
          type: "FrameNode",
          id: "card",
          name: "Card",
        },
      },
    });

    state.webPages.push({
      id: "page-about",
      path: "/about",
      draft: false,
      collectionId: null,
    });
    Object.assign(runtime.port, {
      getParent: async (id: string) => (pages[id] === undefined ? null : { id: pages[id] }),
      getRect: async (id: string) =>
        id === "card"
          ? {
              x: 24,
              y: 96,
              width: 320,
              height: 200,
            }
          : null,
    });

    const read = await runOperation(
      nodesRead,
      { runtime },
      {
        nodeId: "card",
        depth: 0,
      },
    );

    expect(read.pagePath).toBe("/about");
    expect(read.xml).toContain('$rect="x:24 y:96 width:320 height:200"');
  });

  it("reads the page root as XML by default, JSON on request, and refuses oversized results with a hint", async () => {
    const tree = {
      type: "WebPageNode",
      id: "page-home",
      children: [
        {
          type: "FrameNode",
          id: "bp1",
        },
      ],
    };
    const huge = {
      id: "x",
      text: "a".repeat(NODES_READ_MAX_CHARS),
    };
    const { runtime } = createFakeRuntime({
      serializedNodes: {
        "page-home": tree,
        x: huge,
      },
    });

    await expect(runOperation(nodesRead, { runtime }, {})).resolves.toMatchObject({
      pagePath: "/",
      xml: '<WebPageNode id="page-home">\n  <FrameNode id="bp1" />\n</WebPageNode>',
    });
    await expect(runOperation(nodesRead, { runtime }, { format: "json" })).resolves.toMatchObject({ node: tree });
    await expect(runOperation(nodesRead, { runtime }, { nodeId: "x" })).rejects.toThrow(/Lower depth/);
  });

  it("reads several nodes in one call and lists the ids it cannot find instead of failing", async () => {
    const { runtime } = createFakeRuntime({
      serializedNodes: {
        a: {
          type: "FrameNode",
          id: "a",
        },
        b: {
          type: "RichTextNode",
          id: "b",
        },
      },
    });

    await expect(runOperation(nodesRead, { runtime }, { nodeIds: ["a", "gone", "b"] })).resolves.toMatchObject({
      xml: '<FrameNode id="a" />\n<RichTextNode id="b" />',
      missing: ["gone"],
    });
  });
});
