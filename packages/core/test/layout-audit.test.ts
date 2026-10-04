import { describe, expect, it } from "vitest";
import { auditTree } from "../src/layout-audit/audit.ts";
import type { SerializedNode } from "../src/types/dsl.ts";
import type { AuditContext, AuditTextStyle } from "../src/types/layout-audit.ts";

let ids = 0;

function node(
  type: string,
  name: string,
  attributes: Record<string, string> = {},
  children: SerializedNode[] = [],
): SerializedNode {
  ids += 1;

  return {
    type,
    id: `n${ids}`,
    name,
    attributes,
    ...(children.length === 0 ? {} : { children }),
  };
}

const text = (name: string, style: string, content: string, attributes: Record<string, string> = {}) =>
  node("RichTextNode", name, {
    textStylePreset: style,
    text: content,
    width: "1fr",
    ...attributes,
  });

function context(overrides: Partial<Record<string, Partial<AuditTextStyle>>> = {}, hasTokens = true): AuditContext {
  const base: Record<string, AuditTextStyle> = {
    "Heading 1": style("h1", "center"),
    "Heading 2": style("h2", "center"),
    "Heading 3": style("h3", "left"),
    Label: {
      ...style("p", "left"),
      transform: "uppercase",
    },
    Body: style("p", "left"),
  };
  const styles = Object.fromEntries(
    Object.entries(base).map(([name, value]) => [
      name,
      {
        ...value,
        ...overrides[name],
      },
    ]),
  );

  return {
    textStyle: (preset) => (typeof preset === "string" ? (styles[preset] ?? null) : null),
    textStyles: Object.values(styles),
    hasTokens,
  };
}

function style(tag: string, alignment: string): AuditTextStyle {
  return {
    tag,
    alignment,
    transform: "none",
    family: "Inter",
    balance: false,
  };
}

const rulesOf = (issues: { rule: string }[]) => new Set(issues.map((found) => found.rule));

describe("layout audit", () => {
  it("finds the defect classes of a generated page: edges, ragged cards, text links, widths, habits", () => {
    const card = (number: string, title: string) =>
      node(
        "FrameNode",
        "Card",
        {
          layout: "stack",
          stackDirection: "vertical",
          height: "auto",
          fill: "#F7F6F2",
        },
        [
          node("RichTextNode", "Number", {
            textStylePreset: "Label",
            text: number,
            width: "auto",
          }),
          text("Title", "Heading 3", title),
        ],
      );
    const page = node("WebPageNode", "Home", {}, [
      node(
        "FrameNode",
        "Desktop",
        {
          layout: "stack",
          stackDirection: "vertical",
          width: "1200px",
        },
        [
          node(
            "FrameNode",
            "Navigation",
            {
              layout: "stack",
              stackDirection: "horizontal",
              stackDistribution: "space-between",
              width: "1fr",
              padding: "20px 40px 20px 40px",
            },
            [
              text("Docs", "Body", "Docs", {
                link: "https://framer.com",
                width: "auto",
              }),
            ],
          ),
          node(
            "FrameNode",
            "Hero",
            {
              layout: "stack",
              width: "1fr",
              padding: "160px 40px 160px 40px",
            },
            [
              node(
                "FrameNode",
                "Content",
                {
                  layout: "stack",
                  stackDirection: "vertical",
                  width: "1fr",
                  maxWidth: "760px",
                },
                [
                  node("RichTextNode", "Label", {
                    textStylePreset: "Label",
                    text: "New",
                    width: "auto",
                  }),
                  text("Title", "Heading 1", "Sites, live"),
                ],
              ),
            ],
          ),
          node(
            "FrameNode",
            "Features",
            {
              layout: "stack",
              width: "1fr",
              padding: "120px 40px 120px 40px",
            },
            [
              node("RichTextNode", "Label", {
                textStylePreset: "Label",
                text: "What",
                width: "auto",
              }),
              text("Title", "Heading 2", "Everything"),
              node(
                "FrameNode",
                "Grid",
                {
                  layout: "grid",
                  gridColumnCount: "3",
                  width: "1fr",
                  maxWidth: "1120px",
                },
                [card("01", "Tokens"), card("02", "Styles"), card("03", "Layout")],
              ),
            ],
          ),
          node(
            "FrameNode",
            "Stats",
            {
              layout: "stack",
              width: "1fr",
              padding: "96px 40px 96px 40px",
            },
            [
              node("FrameNode", "Row", {
                layout: "grid",
                gridColumnCount: "4",
                width: "1fr",
                maxWidth: "1120px",
              }),
            ],
          ),
          node(
            "FrameNode",
            "Footer",
            {
              layout: "stack",
              width: "1fr",
              padding: "32px 40px 32px 40px",
            },
            [text("Note", "Body", "Made with care")],
          ),
        ],
      ),
    ]);
    const rules = rulesOf(auditTree(page, context()));

    for (const rule of [
      "mixed-alignment",
      "uneven-grid-cells",
      "text-link",
      "container-width",
      "section-rhythm",
      "numbered-cards",
      "no-imagery",
      "default-font",
      "heading-balance",
    ]) {
      expect(rules, rule).toContain(rule);
    }
  });

  it("finds no defects in the same content built with one edge, filled rows and contained sections", () => {
    const card = (title: string) =>
      node(
        "FrameNode",
        "Card",
        {
          layout: "stack",
          stackDirection: "vertical",
          stackAlignment: "start",
          height: "1fr",
          fill: "var(--token-a)",
        },
        [text("Title", "Heading 3", title), text("Body", "Body", "Short and real.")],
      );
    const container = (children: SerializedNode[]) =>
      node(
        "FrameNode",
        "Container",
        {
          layout: "stack",
          stackDirection: "vertical",
          stackAlignment: "start",
          width: "1fr",
          maxWidth: "1120px",
        },
        children,
      );
    const breakpoint = node(
      "FrameNode",
      "Desktop",
      {
        layout: "stack",
        stackDirection: "vertical",
        width: "1200px",
      },
      [
        node(
          "FrameNode",
          "Navigation",
          {
            layout: "stack",
            width: "1fr",
            padding: "20px 40px 20px 40px",
          },
          [
            container([
              node("FrameNode", "Docs link", {
                layout: "stack",
                width: "auto",
                link: "/docs",
              }),
            ]),
          ],
        ),
        node(
          "FrameNode",
          "Hero",
          {
            layout: "stack",
            width: "1fr",
            padding: "128px 40px 128px 40px",
          },
          [container([text("Title", "Heading 1", "Sites, live", { width: "1fr" })])],
        ),
        node(
          "FrameNode",
          "Features",
          {
            layout: "stack",
            width: "1fr",
            padding: "128px 40px 128px 40px",
          },
          [
            container([
              node(
                "FrameNode",
                "Grid",
                {
                  layout: "grid",
                  gridColumnCount: "3",
                  gridRowHeightType: "auto",
                  width: "1fr",
                },
                [card("Tokens"), card("Styles"), card("Layout")],
              ),
            ]),
          ],
        ),
      ],
    );
    const issues = auditTree(
      node("WebPageNode", "Home", {}, [breakpoint]),
      context({ "Heading 1": { alignment: "left" } }),
    );

    expect(issues.filter((found) => found.severity === "defect")).toEqual([]);
  });
});
