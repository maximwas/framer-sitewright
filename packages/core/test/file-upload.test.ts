import { expect, it } from "vitest";
import { fileUpload } from "../src/operations/assets/file-upload.ts";
import { runOperation } from "../src/operations/define.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

it("regression: a local file goes to Framer as bytes, since Framer cannot fetch a data URL", async () => {
  const { runtime, state } = createFakeRuntime(
    {},
    {
      withAgent: false,
      transport: "plugin",
    },
  );

  await runOperation(
    fileUpload,
    { runtime },
    {
      url: "data:video/webm;base64,GkXfowE=",
      name: "box.webm",
    },
  );
  await runOperation(fileUpload, { runtime }, { url: "https://example.com/box.webm" });

  expect(state.uploadedFiles.map(({ source }) => source)).toEqual([
    {
      bytes: new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x01]),
      mimeType: "video/webm",
    },
    "https://example.com/box.webm",
  ]);
});
