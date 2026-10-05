import { expect, it } from "vitest";
import { auditTouched } from "../src/operations/design/audit-touched.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

it("regression: a new layer put into a breakpoint is audited alone, not with every section of the page", async () => {
  const { runtime } = createFakeRuntime({
    serializedNodes: {
      desktop: {
        type: "FrameNode",
        id: "desktop",
        name: "Desktop",
        $isPrimary: true,
        attributes: {
          layout: "stack",
          width: "1440px",
        },
        children: [
          {
            type: "FrameNode",
            id: "section",
            name: "Section",
            attributes: {
              layout: "stack",
              width: "1fr",
              height: "640px",
            },
            children: [
              {
                type: "RichTextNode",
                id: "copy",
                name: "Copy",
                attributes: {
                  width: "900px",
                  text: "An older section with its own findings",
                },
              },
            ],
          },
          {
            type: "FrameNode",
            id: "overlay",
            name: "Overlay",
            attributes: {
              position: "fixed",
              width: "1fr",
              height: "100vh",
            },
          },
        ],
      },
    },
  });
  const issues = await auditTouched(runtime, '<FrameNode parent="desktop" key="overlay" />', "/", {
    overlay: "overlay",
  });

  expect(issues.map((found) => found.nodeId).filter((id) => id === "section" || id === "copy")).toEqual([]);
});
