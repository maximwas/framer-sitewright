import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { fileSourceOf } from "../src/assets/file-source.ts";

it("uploads a real local video as a data URL and refuses a disguised file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "sitewright-file-"));
  const video = join(directory, "box.webm");
  const disguised = join(directory, "clip.mp4");

  await writeFile(video, Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01]));
  await writeFile(disguised, "-----BEGIN OPENSSH PRIVATE KEY-----");

  expect(await fileSourceOf({ path: video })).toBe("data:video/webm;base64,GkXfowE=");
  expect(await fileSourceOf({ url: "https://example.com/a.mp4" })).toBe("https://example.com/a.mp4");
  await expect(fileSourceOf({ path: disguised })).rejects.toThrow(/does not hold/);
  await expect(fileSourceOf({ url: "http://example.com/a.mp4" })).rejects.toThrow(/https/);
});
