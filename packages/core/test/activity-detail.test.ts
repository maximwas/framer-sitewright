import { describe, expect, it } from "vitest";
import { describeCall } from "../src/history/activity-detail.ts";
import { designApply } from "../src/operations/design/apply.ts";
import { nodesRead } from "../src/operations/nodes/read.ts";

describe("activity detail: what a call read or made, for the panel", () => {
  it("names the node nodes_read read, counts its nodes and links to it", () => {
    const xml = [
      '<FrameNode id="hero1" name="Hero &amp; Intro">',
      '  <RichTextNode id="t1"><TextBlock tag="h1">Hi</TextBlock></RichTextNode>',
      "</FrameNode>",
    ].join("\n");

    expect(
      describeCall(
        nodesRead,
        { nodeId: "hero1" },
        {
          pagePath: "/",
          xml,
          chars: xml.length,
        },
      ),
    ).toEqual({
      subject: "Hero & Intro, depth 2",
      summary: "3 nodes",
      nodes: [
        {
          id: "hero1",
          name: "Hero & Intro",
        },
      ],
      images: [],
    });
  });

  it("previews each image a design_apply batch puts in once, from Framer's CDN and Unsplash only", () => {
    const image = "https://framerusercontent.com/images/abc.webp";
    const detail = describeCall(
      designApply,
      {
        xml: `<FrameNode parent="p" fill="${image}" /><FrameNode parent="p" fill="${image}" />`,
        dsl: 'SET a fill="https://images.unsplash.com/photo-1?w=800"; SET b link="https://example.com/x.png";',
      },
      {
        ok: true,
        message: "",
        errors: [],
        warnings: [],
        lint: [],
        renamedIds: {},
      },
    );

    expect(detail?.images).toEqual([image, "https://images.unsplash.com/photo-1?w=800"]);
  });

  it("gives no detail instead of failing the call when the input does not parse", () => {
    expect(
      describeCall(
        nodesRead,
        { depth: 99 },
        {
          pagePath: "/",
          chars: 0,
        },
      ),
    ).toBeNull();
  });
});
