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
    "Heading 1": style("Heading 1", "h1", "center", 48),
    "Heading 2": style("Heading 2", "h2", "center", 40),
    "Heading 3": style("Heading 3", "h3", "left", 20),
    Label: {
      ...style("Label", "p", "left", 14),
      transform: "uppercase",
    },
    Body: style("Body", "p", "left", 16),
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

/** A style as generated pages set it: Inter, tracking 0, line height 1.2, no balance. */
function style(name: string, tag: string, alignment: string, fontSize: number): AuditTextStyle {
  return {
    name,
    tag,
    alignment,
    transform: "none",
    family: "Inter",
    balance: false,
    fontSize,
    narrowFontSize: fontSize,
    letterSpacing: 0,
    lineHeight: 1.2,
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
              node("FrameNode", "Photo", {
                width: "1fr",
                height: "auto",
                backgroundImage: "https://framerusercontent.com/a.png",
              }),
              node(
                "FrameNode",
                "Pill",
                {
                  layout: "stack",
                  width: "auto",
                },
                [
                  node("FrameNode", "Fill", {
                    layout: "stack",
                    width: "1fr",
                  }),
                ],
              ),
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
      "heading-balance",
      "edge-flush-text",
      "image-collapse",
      "fit-parent-fill-child",
      "display-type",
      "flat-hierarchy",
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
          stackDistribution: "start",
          height: "1fr",
          padding: "32px 32px 32px 32px",
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

  it("finds layouts a phone breakpoint copies from desktop unchanged, and template habits once per page", () => {
    /** The page at one width; `adapt` overrides layers by name, as a breakpoint's copies do. */
    const breakpoint = (name: string, width: number, adapt: Record<string, Record<string, string>> = {}) => {
      const own = (layer: string, attributes: Record<string, string>) => ({
        ...attributes,
        ...adapt[layer],
      });
      const section = (title: string, style: string, children: SerializedNode[]) =>
        node(
          "FrameNode",
          title,
          own(title, {
            layout: "stack",
            stackDirection: "vertical",
            stackAlignment: "start",
            width: "1fr",
            padding: "128px 64px 128px 64px",
          }),
          [text("Label", "Label", title), text("Title", style, `${title} heading`), ...children],
        );

      return node(
        "FrameNode",
        name,
        {
          layout: "stack",
          stackDirection: "vertical",
          width: `${width}px`,
        },
        [
          section("Work", "Heading 1", [
            node(
              "FrameNode",
              "Grid",
              own("Grid", {
                layout: "grid",
                gridColumnCount: "3",
                gridRowHeightType: "auto",
                width: "1fr",
              }),
              [text("One", "Body", "One"), text("Two", "Body", "Two"), text("Three", "Body", "Three")],
            ),
          ]),
          section("Studio", "Heading 2", [
            node(
              "FrameNode",
              "Row",
              own("Row", {
                layout: "stack",
                stackDirection: "horizontal",
                stackAlignment: "start",
                stackDistribution: "start",
                gap: "48px",
                width: "1fr",
              }),
              [
                node("FrameNode", "Photo", {
                  width: "1fr",
                  aspectRatio: "1.2",
                  backgroundImage: "https://framerusercontent.com/a.jpg",
                }),
                text("Copy", "Body", "Two makers and a drawing table."),
              ],
            ),
          ]),
          section("Process", "Heading 2", []),
        ],
      );
    };
    const page = (phone: SerializedNode) =>
      node("WebPageNode", "Home", {}, [
        {
          ...breakpoint("Desktop", 1440),
          $isPrimary: true,
        },
        {
          ...phone,
          $isReplica: true,
        },
      ]);
    const desktopType = context({ "Heading 1": { narrowFontSize: 96 } });
    const unadapted = auditTree(page(breakpoint("Phone", 390)), desktopType);
    const rules = unadapted.map((found) => found.rule);

    for (const rule of ["narrow-grid", "narrow-row", "narrow-padding", "narrow-type"]) {
      expect(rules, rule).toContain(rule);
    }

    expect(rules.filter((rule) => rule === "eyebrow-labels")).toHaveLength(1);

    const sidePadding = { padding: "64px 20px 64px 20px" };
    const adapted = auditTree(
      page(
        breakpoint("Phone", 390, {
          Work: sidePadding,
          Studio: sidePadding,
          Process: sidePadding,
          Grid: {
            layout: "stack",
            gridColumnCount: "1",
          },
          Row: { stackDirection: "vertical" },
        }),
      ),
      context({
        "Heading 1": { narrowFontSize: 44 },
        "Heading 2": { narrowFontSize: 36 },
      }),
    );

    expect(adapted.map((found) => found.rule).filter((rule) => rule.startsWith("narrow-"))).toEqual([]);
  });

  it("regression: a large paragraph style (a quote) is not the body size of the hierarchy check", () => {
    const issues = auditTree(
      node("WebPageNode", "Home", {}, [node("FrameNode", "Desktop", { width: "1440px" })]),
      context({
        "Heading 1": { fontSize: 96 },
        Body: { fontSize: 18 },
        Label: {
          name: "Quote",
          fontSize: 36,
        },
      }),
    );

    expect(issues.map((found) => found.rule)).not.toContain("flat-hierarchy");
  });

  it("regression: a phone header of a wordmark, hidden links and a button is not columns side by side", () => {
    const column = (name: string, child: SerializedNode, attributes: Record<string, string> = {}) =>
      node(
        "FrameNode",
        name,
        {
          layout: "stack",
          stackDirection: "horizontal",
          width: "1fr",
          ...attributes,
        },
        [child],
      );
    const header = node(
      "FrameNode",
      "Container",
      {
        layout: "stack",
        stackDirection: "horizontal",
        stackAlignment: "center",
        stackDistribution: "start",
        width: "1fr",
        padding: "12px 20px 12px 20px",
      },
      [
        column("Brand", text("Wordmark", "Label", "Kamin", { width: "auto" })),
        column("Links", node("FrameNode", "Link", { width: "auto" }), { visible: "false" }),
        column("Actions", node("FrameNode", "Button", { width: "auto" })),
      ],
    );
    const phone = node("FrameNode", "Phone", { width: "390px" }, [
      node("FrameNode", "Header", { width: "1fr" }, [header]),
    ]);
    const issues = auditTree(node("WebPageNode", "Home", {}, [phone]), context());

    expect(issues.map((found) => found.rule)).not.toContain("narrow-row");
  });

  it("regression: a breakpoint's own fixed size and a sticky 100vh stage are not findings (the DSL prints no position)", () => {
    const stage = node("FrameNode", "Stage", {
      layout: "stack",
      position: "sticky",
      width: "1fr",
      height: "100vh",
    });
    const desktop = {
      ...node(
        "FrameNode",
        "Desktop",
        {
          layout: "stack",
          stackDirection: "vertical",
          width: "1440px",
          height: "1000px",
        },
        [stage, text("Title", "Heading 1", "Sites, live")],
      ),
      $isPrimary: true,
    };
    const rules = auditTree(node("WebPageNode", "Home", {}, [desktop]), context()).map((found) => found.rule);

    for (const rule of ["fixed-width", "fixed-height", "fixed-vh"]) {
      expect(rules, rule).not.toContain(rule);
    }
  });

  it("regression: cards filling the height of a row that hugs it are the equal-height pattern, not a fixed size", () => {
    const card = (title: string) =>
      node(
        "FrameNode",
        "Card",
        {
          layout: "stack",
          stackDirection: "vertical",
          stackAlignment: "start",
          stackDistribution: "start",
          padding: "32px",
          fill: "#ffffff",
          width: "1fr",
          height: "1fr",
        },
        [text("Title", "Heading 3", title)],
      );
    const row = node(
      "FrameNode",
      "Row",
      {
        layout: "stack",
        stackDirection: "horizontal",
        stackAlignment: "start",
        stackDistribution: "start",
        width: "1fr",
        height: "auto",
      },
      [card("Audit"), card("Rebuild")],
    );
    const column = node(
      "FrameNode",
      "Column",
      {
        layout: "stack",
        stackDirection: "vertical",
        stackAlignment: "start",
        stackDistribution: "start",
        width: "1fr",
        height: "auto",
      },
      [card("Retainer")],
    );
    const fills = (target: SerializedNode) =>
      auditTree(target, context()).filter((found) => found.rule === "fit-parent-fill-child");

    expect(fills(row)).toEqual([]);
    expect(fills(column)).toHaveLength(1);
  });

  it("regression: a divider row (a border on one side, as the Plugin API reads it) is no card that needs side padding", () => {
    const row = (border: string) =>
      node(
        "FrameNode",
        "Row",
        {
          layout: "stack",
          stackDirection: "horizontal",
          stackAlignment: "start",
          stackDistribution: "start",
          padding: "28px 0px",
          border,
          width: "1fr",
          height: "auto",
        },
        [text("Title", "Heading 3", "Approvals live in someone's inbox")],
      );
    const flush = (border: string) =>
      auditTree(row(border), context()).filter((found) => found.rule === "edge-flush-text");

    expect(flush("1px 0px 0px 0px solid var(--token-line)")).toEqual([]);
    expect(flush("1px solid var(--token-line)")).toHaveLength(1);
  });

  it("regression: a component instance pinned to all sides keeps its auto size and collapses (seen: 200 x 200)", () => {
    const pinned = (size: string) =>
      node("ComponentInstanceNode", "Hero Reel", {
        position: "absolute",
        left: "0px",
        right: "0px",
        top: "0px",
        bottom: "0px",
        width: size,
        height: size,
      });
    const collapsed = (size: string) =>
      auditTree(
        node(
          "FrameNode",
          "Stage",
          {
            width: "1fr",
            height: "780px",
          },
          [pinned(size)],
        ),
        context(),
      ).filter((found) => found.rule === "pinned-instance-auto");

    expect(collapsed("auto")).toHaveLength(1);
    expect(collapsed("100%")).toEqual([]);
  });

  it("regression: component instances filling a row that hugs them size it with their own content (seen: Steps, Plans)", () => {
    const step = () =>
      node("ComponentInstanceNode", "Step", {
        width: "1fr",
        height: "1fr",
      });
    const row = node(
      "FrameNode",
      "Steps",
      {
        layout: "stack",
        stackDirection: "horizontal",
        stackAlignment: "start",
        stackDistribution: "start",
        width: "1fr",
        height: "auto",
      },
      [step(), step(), step()],
    );

    expect(rulesOf(auditTree(row, context()))).not.toContain("fit-parent-fill-child");
  });

  it("regression: a full-bleed ticker is not a section that ignores the container width (seen: a client logo ticker)", () => {
    const contained = node(
      "FrameNode",
      "Services",
      {
        layout: "stack",
        width: "1fr",
      },
      [
        node(
          "FrameNode",
          "Container",
          {
            layout: "stack",
            width: "1fr",
            maxWidth: "1440px",
          },
          [text("Title", "Heading 2", "What we do")],
        ),
      ],
    );
    const ticker = {
      ...node(
        "FrameNode",
        "Ticker",
        {
          layout: "stack",
          stackDirection: "horizontal",
          width: "1fr",
        },
        [text("Client", "Body", "Kessler Logistik", { width: "auto" })],
      ),
    };
    const tickerNode = {
      ...ticker,
      attributes: {
        ...ticker.attributes,
        tickerEffect: { velocity: 50 },
      },
    };
    const clients = node(
      "FrameNode",
      "Clients",
      {
        layout: "stack",
        width: "1fr",
      },
      [tickerNode],
    );
    const desktop = {
      ...node(
        "FrameNode",
        "Desktop",
        {
          layout: "stack",
          width: "1440px",
        },
        [contained, clients, contained],
      ),
      $isPrimary: true,
    };

    expect(rulesOf(auditTree(node("WebPageNode", "Home", {}, [desktop]), context()))).not.toContain("container-width");
  });

  it("regression: photos set between words and hidden layers are no cards of uneven height (seen: a statement, a compact variant)", () => {
    const pill = () =>
      node("FrameNode", "Pill", {
        fill: "https://framerusercontent.com/images/a.jpg",
        width: "112px",
        height: "56px",
      });
    const words = node(
      "FrameNode",
      "Words",
      {
        layout: "stack",
        stackDirection: "horizontal",
        stackWrapEnabled: "true",
        stackAlignment: "center",
        stackDistribution: "center",
        width: "1fr",
        height: "auto",
      },
      [
        text("Words", "Body", "Most companies", { width: "auto" }),
        pill(),
        text("Words", "Body", "need fewer handoffs", { width: "auto" }),
        pill(),
      ],
    );
    const card = (attributes: Record<string, string>) =>
      node(
        "FrameNode",
        "Card",
        {
          layout: "stack",
          fill: "#ffffff",
          padding: "24px",
          width: "1fr",
          ...attributes,
        },
        [text("Quote", "Body", "One form instead of four calls")],
      );
    const compact = node(
      "FrameNode",
      "Compact",
      {
        layout: "stack",
        stackDirection: "horizontal",
        stackAlignment: "start",
        stackDistribution: "start",
        width: "1fr",
        height: "auto",
      },
      [
        card({ height: "1fr" }),
        card({
          height: "auto",
          visible: "false",
        }),
      ],
    );

    expect(rulesOf(auditTree(words, context()))).not.toContain("uneven-row-cards");
    expect(rulesOf(auditTree(compact, context()))).not.toContain("uneven-row-cards");
  });

  it("regression: a page breakpoint takes its fill from the layout template, and a design page board keeps its width", () => {
    const desktop = {
      ...node(
        "FrameNode",
        "Desktop",
        {
          layout: "stack",
          width: "1440px",
          fill: "rgb(243, 241, 236)",
        },
        [text("Title", "Heading 1", "Page not found")],
      ),
      $isPrimary: true,
    };
    const page = (template: boolean) =>
      auditTree(
        {
          ...node("WebPageNode", "404", {}, [desktop]),
          ...(template ? { $layoutTemplateId: "Dik9INLUw" } : {}),
        },
        context(),
      ).filter((found) => found.rule === "raw-color");
    const board = node(
      "FrameNode",
      "Start here",
      {
        layout: "stack",
        width: "1440px",
      },
      [text("Title", "Heading 2", "Read me first")],
    );

    expect(page(true)).toEqual([]);
    expect(page(false)).toHaveLength(1);
    expect(
      rulesOf(
        auditTree(
          {
            ...board,
            $groundNodeId: board.id,
          },
          context(),
        ),
      ),
    ).not.toContain("fixed-width");
  });

  it("regression: an empty spacer filling a card that hugs its content pins the last item to the bottom (seen: Step cards)", () => {
    const card = (spacer: SerializedNode) =>
      node(
        "FrameNode",
        "Step",
        {
          layout: "stack",
          stackDirection: "vertical",
          stackAlignment: "start",
          stackDistribution: "start",
          fill: "#ffffff",
          padding: "32px",
          width: "320px",
          height: "auto",
        },
        [
          text("Title", "Heading 3", "Watch"),
          spacer,
          node("ComponentInstanceNode", "Output", {
            width: "auto",
            height: "auto",
          }),
        ],
      );
    const fills = (target: SerializedNode) =>
      auditTree(target, context()).filter((found) => found.rule === "fit-parent-fill-child");

    expect(
      fills(
        card(
          node("FrameNode", "Spacer", {
            width: "1fr",
            height: "1fr",
          }),
        ),
      ),
    ).toEqual([]);
    expect(
      fills(
        card(
          node(
            "FrameNode",
            "Body",
            {
              layout: "stack",
              width: "1fr",
              height: "1fr",
            },
            [text("Text", "Body", "We sit with each team")],
          ),
        ),
      ),
    ).toHaveLength(1);
  });
});
