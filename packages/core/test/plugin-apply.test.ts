import { expect, it } from "vitest";
import { applyXmlWithPluginApi } from "../src/plugin-nodes/apply.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

it("regression: refuses a batch with text before any change when the runtime cannot create text", async () => {
  const { runtime } = createFakeRuntime(
    {},
    {
      withAgent: false,
      transport: "plugin",
    },
  );
  const result = await applyXmlWithPluginApi(
    { runtime },
    '<FrameNode parent="page" key="hero"><RichTextNode>Hello</RichTextNode></FrameNode>',
    "/",
  );

  expect(result).toMatchObject({
    ok: false,
    message: expect.stringMatching(/cannot create text nodes: nothing was changed/),
    keys: {},
  });
});
