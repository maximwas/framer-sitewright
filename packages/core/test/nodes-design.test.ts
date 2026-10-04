import { describe, expect, it } from "vitest";
import { NODES_READ_MAX_CHARS } from "../src/constants/nodes.ts";
import { runOperation } from "../src/operations/define.ts";
import { nodesRead } from "../src/operations/nodes/read.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

describe("nodes.read", () => {
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
});
