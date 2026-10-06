import { describe, expect, it } from "vitest";
import { runOperation } from "../src/operations/define.ts";
import { stylesUsage } from "../src/operations/styles/usage.ts";
import { newTextStyle } from "../src/testing/fake-state.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

function token(id: string, path: string) {
  return {
    id,
    name: path,
    path: `/${path}`,
    light: "rgb(0, 0, 0)",
    dark: null,
  };
}

const INK = token("tok-ink", "Ink");
const LINE = token("tok-line", "Line");
const ACCENT = token("tok-accent", "Accent");
const BODY_INK = token("tok-body", "Body Ink");
const SPARE = token("tok-spare", "Spare");

function project() {
  return createFakeRuntime({
    colorStyles: [INK, LINE, ACCENT, BODY_INK, SPARE],
    textStyles: [
      {
        ...newTextStyle("text-body", "/Body"),
        color: BODY_INK,
      },
      newTextStyle("text-unused", "/Unused"),
    ],
    linkStyles: [
      {
        id: "link-nav",
        name: "Links/Nav",
        attributes: { "link.textColor": "var(--token-tok-accent)" },
      },
      {
        id: "link-spare",
        name: "Links/Spare",
        attributes: { "link.textColor": "rgb(1, 2, 3)" },
      },
    ],
    webPages: [
      {
        id: "page-home",
        path: "/",
        draft: false,
        collectionId: null,
      },
      {
        id: "page-about",
        path: "/about",
        draft: false,
        collectionId: null,
      },
    ],
    components: [
      {
        id: "comp-header",
        name: "Header",
        componentName: "Navigation/Header",
      },
    ],
    layers: {
      "page-home": [
        {
          type: "FrameNode",
          id: "bp-desktop",
          $isPrimary: true,
          attributes: { fill: "var(--token-tok-line)" },
        },
        {
          type: "RichTextNode",
          id: "t1",
          attributes: {
            textStylePreset: "Body",
            textColor: "var(--token-tok-ink)",
            linkStylePreset: "Links/Nav",
          },
        },
        // The same text on the phone breakpoint, and a run inside it: one layer.
        {
          type: "RichTextNode",
          id: "bp-phonet1",
          $originalId: "t1",
          attributes: {
            textStylePreset: "Body",
            textColor: "var(--token-tok-ink)",
          },
        },
        {
          type: "TextRun",
          id: "v:t1:0:0",
          attributes: { linkStylePreset: "Links/Nav" },
        },
      ],
      "page-about": [
        {
          type: "FrameNode",
          id: "f2",
          attributes: {
            border: "1px solid var(--token-tok-line)",
            hoverEffect: { backgroundColor: "var(--token-tok-ink)" },
          },
        },
      ],
      "comp-header": [
        {
          type: "RichTextNode",
          id: "c1",
          attributes: {
            textStylePreset: "Body",
            linkStylePreset: "Links/Nav",
          },
        },
      ],
    },
  });
}

describe("styles.usage", () => {
  it("counts the layers using each token and style on every page and component, and lists what nothing uses", async () => {
    const { runtime } = project();
    const usage = await runOperation(stylesUsage, { runtime }, {});

    expect(usage).toEqual({
      scope: "site",
      tokens: {
        used: [
          {
            id: "tok-ink",
            path: "Ink",
            layers: 2,
            usedIn: ["/", "/about"],
            styles: [],
          },
          {
            id: "tok-line",
            path: "Line",
            layers: 2,
            usedIn: ["/", "/about"],
            styles: [],
          },
          {
            id: "tok-accent",
            path: "Accent",
            layers: 0,
            usedIn: [],
            styles: ["Links/Nav"],
          },
          {
            id: "tok-body",
            path: "Body Ink",
            layers: 0,
            usedIn: [],
            styles: ["Body"],
          },
        ],
        unused: ["Spare"],
      },
      textStyles: {
        used: [
          {
            id: "text-body",
            path: "Body",
            layers: 2,
            usedIn: ["/", "component Navigation/Header"],
          },
        ],
        unused: ["Unused"],
      },
      linkStyles: {
        used: [
          {
            id: "link-nav",
            path: "Links/Nav",
            layers: 2,
            usedIn: ["/", "component Navigation/Header"],
          },
        ],
        unused: ["Links/Spare"],
      },
      note: null,
    });
  });

  it("reads one page when asked, and says that unused means unused there", async () => {
    const { runtime } = project();
    const usage = await runOperation(stylesUsage, { runtime }, { pagePath: "/about" });

    expect(usage.scope).toBe("/about");
    expect(usage.textStyles.unused).toEqual(["Body", "Unused"]);
    expect(usage.tokens.used.map(({ path, layers }) => [path, layers])).toEqual([
      ["Ink", 1],
      ["Line", 1],
      ["Accent", 0],
      ["Body Ink", 0],
    ]);
    expect(usage.note).toContain("whole site");
  });
});
