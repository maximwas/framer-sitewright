import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { fitSvg, svgMarkupOf } from "../src/assets/svg-source.ts";

const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="24" viewBox="0 0 48 24"><circle cx="24" cy="12" r="8"/></svg>';

describe("svg_add markup", () => {
  it("sizes the root by width in the viewBox's ratio and keeps the viewBox's frame as an unpainted rect", () => {
    const fitted = fitSvg(ICON, {
      width: 96,
      keepViewBox: true,
    });

    expect(fitted).toContain('width="96"');
    expect(fitted).toContain('height="48"');
    expect(fitted).toMatch(/<svg[^>]*><rect x="0" y="0" width="48" height="24" fill="none"\/><circle/);
  });

  it("takes the frame from px sizes without a viewBox, and refuses a root it cannot measure", () => {
    expect(fitSvg('<svg width="10px" height="20"><path d="M0 0h1"/></svg>', { width: 5 })).toContain('height="10"');
    expect(() => fitSvg('<svg width="100%"><path d="M0 0h1"/></svg>', { keepViewBox: true })).toThrow(/viewBox/);
    expect(fitSvg(ICON, {})).toBe(ICON);
  });

  it("reads an .svg file by a relative path and refuses anything else", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sitewright-svg-"));
    const file = join(directory, "logo.svg");
    const notes = join(directory, "notes.svg");

    await writeFile(file, ICON);
    await writeFile(notes, "-----BEGIN OPENSSH PRIVATE KEY-----");

    expect(await svgMarkupOf({ path: relative(process.cwd(), file) })).toBe(ICON);
    await expect(svgMarkupOf({ path: notes })).rejects.toThrow(/not a path to an SVG/);
    await expect(
      svgMarkupOf({
        svg: ICON,
        path: file,
      }),
    ).rejects.toThrow(/exactly one/);
  });
});
