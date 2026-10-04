import { mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { imageSourceOf } from "../src/assets/image-source.ts";

describe("image_upload sources", () => {
  it("turns SVG markup and a local file into data URLs, keeps https URLs, refuses the rest", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';
    const directory = await mkdtemp(join(tmpdir(), "sitewright-image-"));
    const file = join(directory, "logo.png");

    await writeFile(file, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    expect(await imageSourceOf({ svg })).toBe(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
    expect(await imageSourceOf({ path: file })).toBe("data:image/png;base64,iVBORw==");
    expect(await imageSourceOf({ url: "https://example.com/a.jpg" })).toBe("https://example.com/a.jpg");
    await expect(imageSourceOf({ url: "http://example.com/a.jpg" })).rejects.toThrow(/https/);
    await expect(imageSourceOf({ path: "logo.png" })).rejects.toThrow(/absolute path/);

    // Not a picture under a picture's name, nor a link from one to a file that is no image: nothing private goes up.
    const secret = join(directory, "id_rsa");
    const disguised = join(directory, "photo.png");
    const linked = join(directory, "linked.png");

    await writeFile(secret, "-----BEGIN OPENSSH PRIVATE KEY-----");
    await writeFile(disguised, "-----BEGIN OPENSSH PRIVATE KEY-----");
    await symlink(secret, linked);
    await expect(imageSourceOf({ path: disguised })).rejects.toThrow(/does not hold/);
    await expect(imageSourceOf({ path: linked })).rejects.toThrow(/absolute path/);
    await expect(imageSourceOf({})).rejects.toThrow(/exactly one/);
  });
});
