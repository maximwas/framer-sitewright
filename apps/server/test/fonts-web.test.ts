import { describe, expect, it } from "vitest";
import { parseFontFaces, parseFontshare, parseGoogleFonts } from "../src/fonts-web/catalogs.ts";
import { rankFonts } from "../src/utils/fonts-web.ts";

const GOOGLE = `)]}'
{"familyMetadataList":[
  {"family":"Inter","category":"Sans Serif","fonts":{"400":{},"700":{},"400i":{}},"axes":[{"tag":"wght"}],"popularity":3,"trending":40,"dateAdded":"2017-01-01","isNoto":false},
  {"family":"Fraunces","category":"Serif","fonts":{"300":{},"900":{}},"axes":[],"popularity":220,"trending":5,"dateAdded":"2020-06-01","isNoto":false},
  {"family":"Noto Sans Tamil","category":"Sans Serif","fonts":{"400":{}},"axes":[],"popularity":900,"trending":900,"dateAdded":"2019-01-01","isNoto":true},
  {"family":"Google Sans","category":"Sans Serif","fonts":{"400":{}},"axes":[],"popularity":1,"trending":1,"dateAdded":"2025-01-01","isNoto":false,"isBrandFont":true}
]}`;

const FONTSHARE = JSON.stringify({
  fonts: [
    {
      name: "Satoshi",
      slug: "satoshi",
      category: "Sans",
      license_type: "itf_ffl",
      views: 4_000_000,
      views_recent: 90_000,
      inserted_at: "2021-03-01T00:00:00Z",
      styles: [
        {
          weight: { weight: 400 },
          is_italic: false,
          is_variable: false,
        },
        {
          weight: { weight: 400 },
          is_italic: true,
          is_variable: false,
        },
        {
          weight: { weight: 700 },
          is_italic: false,
          is_variable: false,
        },
        {
          weight: { weight: 0 },
          is_italic: false,
          is_variable: true,
        },
      ],
    },
    {
      name: "Zodiak",
      slug: "zodiak",
      category: "Serif, Display",
      license_type: "sil_ofl",
      views: 10,
      views_recent: 1,
      styles: [],
    },
  ],
});

describe("web font catalogs", () => {
  it("reads Google Fonts' metadata without Noto and brand families, with weights, italics and the OFL license", () => {
    const fonts = parseGoogleFonts(GOOGLE);

    expect(fonts.map(({ family }) => family)).toEqual(["Inter", "Fraunces"]);
    expect(fonts[0]).toMatchObject({
      category: "sans",
      weights: [400, 700],
      italic: true,
      variable: true,
      specimen: "https://fonts.google.com/specimen/Inter",
    });
    expect(fonts[0]?.license).toMatch(/Open Font License/);
  });

  it("reads Fontshare's catalog: weights without the variable file, its two licenses, its categories", () => {
    const [satoshi, zodiak] = parseFontshare(FONTSHARE);

    expect(satoshi).toMatchObject({
      family: "Satoshi",
      category: "sans",
      weights: [400, 700],
      italic: true,
      variable: true,
      slug: "satoshi",
    });
    expect(satoshi?.license).toMatch(/ITF Free Font License/);
    expect(zodiak).toMatchObject({ category: "serif" });
    expect(zodiak?.license).toMatch(/Open Font License/);
  });

  it("takes the woff2 file of each @font-face rule with its weight and style", () => {
    const css = `@font-face { font-family: 'Satoshi'; src: url('//cdn.fontshare.com/wf/A.woff2') format('woff2'), url('//cdn.fontshare.com/wf/A.woff') format('woff'); font-weight: 400; font-style: normal; }
@font-face { font-family: 'Satoshi'; src: url('//cdn.fontshare.com/wf/B.woff2') format('woff2'); font-weight: 400; font-style: italic; }`;

    expect(parseFontFaces(css)).toEqual([
      {
        weight: 400,
        italic: false,
        url: "https://cdn.fontshare.com/wf/A.woff2",
      },
      {
        weight: 400,
        italic: true,
        url: "https://cdn.fontshare.com/wf/B.woff2",
      },
    ]);
  });

  it("filters by words and category and orders by popularity, trend or date across both catalogs", () => {
    const fonts = [...parseGoogleFonts(GOOGLE), ...parseFontshare(FONTSHARE)];

    // Fontshare's families rank by their place in its own views, each place worth fifteen of Google's.
    expect(rankFonts(fonts, { sort: "popular" }).map(({ family }) => family)).toEqual([
      "Inter",
      "Satoshi",
      "Zodiak",
      "Fraunces",
    ]);
    expect(
      rankFonts(fonts, {
        sort: "trending",
        category: "serif",
      }).map(({ family }) => family),
    ).toEqual(["Fraunces", "Zodiak"]);
    expect(
      rankFonts(fonts, {
        sort: "new",
        query: "sat",
      }).map(({ family }) => family),
    ).toEqual(["Satoshi"]);
  });
});
