import { expect, it } from "vitest";
import { needsAgent, runOperation } from "../src/operations/define.ts";
import { referenceScreenshot } from "../src/operations/site/reference-screenshot.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

it("asks Framer for a full-page screenshot of a public URL, at a phone width in dark mode, and returns its image URL", async () => {
  const { runtime } = createFakeRuntime();

  expect(needsAgent(referenceScreenshot, { url: "https://example.com" })).toBe(true);

  const shot = await runOperation(
    referenceScreenshot,
    { runtime },
    {
      url: "https://example.com/pricing",
      width: 390,
      theme: "dark",
    },
  );

  expect(shot).toEqual({
    url: "https://example.com/pricing",
    imageUrl: expect.stringMatching(/^https:\/\/framerusercontent\.com\/screenshots\//),
    theme: "dark",
    viewport: {
      width: 390,
      height: 844,
    },
  });
});

it("refuses local and private addresses before asking Framer, and explains a capture Framer could not make", async () => {
  const { runtime, state } = createFakeRuntime({ unreachableUrls: ["https://members.example.com/"] });

  for (const url of ["http://localhost:3000", "http://192.168.1.10/", "https://intranet.local/", "ftp://example.com"]) {
    await expect(runOperation(referenceScreenshot, { runtime }, { url })).rejects.toThrow(/public http/);
  }

  await expect(runOperation(referenceScreenshot, { runtime }, { url: "https://members.example.com/" })).rejects.toThrow(
    /could not capture/,
  );
  expect(state.unreachableUrls).toEqual(["https://members.example.com/"]);
});
