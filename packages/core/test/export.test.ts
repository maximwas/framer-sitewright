import { expect, it } from "vitest";
import { exportHtml, exportReact } from "../src/export/export.ts";
import type { ExportContext } from "../src/export/types.ts";

const context: ExportContext = {
  tokens: new Map([
    [
      "ink",
      {
        name: "Text/Primary",
        light: "rgb(18, 18, 17)",
        dark: null,
      },
    ],
  ]),
  textStyles: new Map([
    [
      "Heading/H2",
      {
        font: {
          family: "Archivo",
          weight: 600,
          style: "normal",
        },
        fontSize: "48px",
        lineHeight: "1.1em",
        letterSpacing: "-0.02em",
        transform: "none",
        alignment: "left",
        decoration: "none",
        balance: true,
        tag: "h2",
      },
    ],
  ]),
};

const tree = {
  type: "FrameNode",
  id: "card",
  name: "Card",
  attributes: {
    layout: "stack",
    stackDirection: "vertical",
    stackAlignment: "start",
    gap: "16px",
    padding: "24px",
    fill: "var(--token-ink)",
    radius: "16px",
    width: "320px",
  },
  children: [
    {
      type: "RichTextNode",
      id: "title",
      attributes: {
        textStylePreset: "Heading/H2",
        width: "1fr",
      },
      children: [
        {
          type: "TextBlock",
          id: "v:title:0",
          attributes: { tag: "h2" },
          children: [
            {
              type: "TextRun",
              id: "v:title:0:0",
              attributes: { text: "Plain <work>" },
            },
          ],
        },
      ],
    },
  ],
};

it("turns a frame tree into semantic HTML with one class per layer, tokens as CSS variables and text styles as fonts", () => {
  const { html, css } = exportHtml(tree, context);

  expect(html).toBe('<div class="card">\n  <h2 class="title">Plain &lt;work&gt;</h2>\n</div>');
  expect(css).toContain(":root {\n  --token-ink: rgb(18, 18, 17);\n}");
  expect(css).toContain(
    ".card {\n  display: flex;\n  flex-direction: column;\n  align-items: flex-start;\n  gap: 16px;\n  padding: 24px;\n  background: var(--token-ink);\n  border-radius: 16px;\n  width: 320px;\n}",
  );
  expect(css).toContain('font-family: "Archivo"');
  expect(css).toContain("text-wrap: balance");
});

it("writes the same tree as a React component with inline styles", () => {
  const code = exportReact(tree, context, "Card");

  expect(code).toContain("export default function Card() {");
  // A text that fills a vertical stack's width is width 100%, not a share of the stack's height.
  expect(code).toContain('<h2 style={{ width: "100%", fontFamily: "\\"Archivo\\"", fontWeight: 600');
  expect(code).toContain('{"Plain <work>"}');
});
