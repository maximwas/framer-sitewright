import { describe, expect, it } from "vitest";
import { runOperation } from "../src/operations/define.ts";
import { templateAudit } from "../src/operations/site/template-audit.ts";
import { handCopiedFindings, logoFindings, placeholderFindings } from "../src/site-checks/template-content.ts";
import { createFakeRuntime } from "../src/testing/index.ts";
import type { SerializedNode } from "../src/types/dsl.ts";
import type { CheckedPage } from "../src/types/site-checks.ts";

let ids = 0;

function node(
  type: string,
  name: string | null,
  attributes: Record<string, unknown> = {},
  children: SerializedNode[] = [],
): SerializedNode {
  ids += 1;

  return {
    type,
    id: `n${ids}`,
    ...(name === null ? {} : { name }),
    attributes,
    ...(children.length === 0 ? {} : { children }),
  };
}

const text = (value: string, name: string | null = null) => node("RichTextNode", name, { text: value });

const photo = (name: string) => node("FrameNode", name, { fill: `https://framerusercontent.com/images/${name}.jpg` });

const card = (name: string) =>
  node("FrameNode", name, {}, [photo(`${name} Photo`), text(`${name} title`), text("12 May 2026")]);

const page = (path: string, content: SerializedNode): CheckedPage => ({
  path,
  attributes: {},
  content,
  complete: true,
});

const rules = (findings: readonly { rule: string }[]) => findings.map(({ rule }) => rule);

describe("template checks", () => {
  it("finds cards copied by hand, not stats, nav links, component instances or a Collection List", () => {
    const content = node("FrameNode", "Desktop", {}, [
      node("FrameNode", "Posts", {}, [card("Post A"), card("Post B"), card("Post C")]),
      node("FrameNode", "Numbers", {}, [
        node("FrameNode", "Stat", {}, [text("120+"), text("Projects")]),
        node("FrameNode", "Stat", {}, [text("14"), text("Countries")]),
        node("FrameNode", "Stat", {}, [text("9"), text("Awards")]),
      ]),
      node("FrameNode", "Nav", {}, [
        node("FrameNode", "Link", {}, [text("Work")]),
        node("FrameNode", "Link", {}, [text("About")]),
        node("FrameNode", "Link", {}, [text("Contact")]),
      ]),
      node("FrameNode", "Team", {}, [
        node("ComponentInstanceNode", "Member", {}),
        node("ComponentInstanceNode", "Member", {}),
        node("ComponentInstanceNode", "Member", {}),
      ]),
      node("FrameNode", "Journal", { "collectionList.limit": "3" }, [card("Item")]),
    ]);
    const findings = handCopiedFindings(page("/", content));

    expect(findings.map(({ rule, nodeName, severity }) => [rule, nodeName, severity])).toEqual([
      ["hand-copied-content", "Posts", "likely"],
    ]);
  });

  it("finds real companies' logos in a logo strip and leaves social icons and the site's own logo alone", () => {
    const content = node("FrameNode", "Desktop", {}, [
      node("FrameNode", "Header", {}, [node("SVGNode", "Logo", {})]),
      node("FrameNode", "Trusted By", {}, [
        node("SVGNode", "Stripe", {}),
        node("FrameNode", "logo-notion.svg", {}),
        node("SVGNode", "Northwind", {}),
      ]),
      node("ComponentInstanceNode", "Brand", { $control__logo: "Airbnb" }),
      node("FrameNode", "Footer", {}, [
        node("ComponentInstanceNode", "Social", { $control__icon: "Instagram" }),
        node("SVGNode", "LinkedIn", {}),
      ]),
    ]);

    expect(logoFindings(page("/", content)).map(({ nodeName }) => nodeName)).toEqual([
      "Stripe",
      "logo-notion.svg",
      "Brand",
    ]);
  });

  it("finds lorem ipsum and a past copyright year in the text of a page, read as runs or as plain text", () => {
    const runs = node("RichTextNode", null, {}, [
      node("TextBlock", null, { tag: "p" }, [node("TextRun", null, { text: "Lorem ipsum dolor sit amet." })]),
    ]);
    const content = node("FrameNode", "Desktop", {}, [runs, text("© 2019 Studio North"), text("© 2026 Studio North")]);

    expect(rules(placeholderFindings(page("/", content), 2026))).toEqual(["placeholder-text", "old-copyright-year"]);
  });
});

describe("template_audit", () => {
  const breakpoint = (name: string, width: number, primary: boolean, children: SerializedNode[] = []) => ({
    ...node("FrameNode", name, { width: `${width}px` }, children),
    ...(primary ? { $isPrimary: true } : { $isReplica: true }),
  });

  function project() {
    const home = {
      ...node("WebPageNode", "Home", { metadata: { title: "Studio North | Architecture for small towns" } }, [
        breakpoint("Desktop", 1200, true, [
          node("FrameNode", "Hero", { fill: "#ff0000" }, [text("Lorem ipsum dolor sit amet", "Headline")]),
          node("FrameNode", "Projects", {}, [card("Case A"), card("Case B"), card("Case C")]),
          node("FrameNode", null, {}, [text("A frame nobody named")]),
          node("FrameNode", "Clients", {}, [node("SVGNode", "Google", {})]),
          node("FrameNode", "Footer", { link: { href: "/missing" } }, [text("© 2019 Studio North")]),
        ]),
      ]),
      id: "page-home",
      $parentId: "root",
    };
    const contact = {
      ...node("WebPageNode", "/contact", { metadata: { title: "Contact Studio North | Book a site visit" } }, [
        breakpoint("Desktop", 1200, true, [node("FrameNode", "Form", { htmlTag: "form" }, [text("Send")])]),
        breakpoint("Tablet", 810, false),
        breakpoint("Phone", 390, false, [
          node("FrameNode", "Grid", {
            layout: "grid",
            gridColumnCount: 4,
          }),
        ]),
      ]),
      id: "page-contact",
      $parentId: "root",
      $layoutTemplateId: "layout-1",
    };

    return createFakeRuntime({
      webPages: [
        {
          id: "page-home",
          path: "/",
          draft: false,
          collectionId: null,
        },
        {
          id: "page-contact",
          path: "/contact",
          draft: false,
          collectionId: null,
        },
      ],
      serializedNodes: {
        "page-home": home,
        "page-contact": contact,
        root: {
          type: "WebPageNode",
          id: "root",
          attributes: { metadata: { favicon: "https://framerusercontent.com/images/mark.svg" } },
        },
      },
      colorStyles: [
        {
          id: "ink",
          name: "Ink",
          path: "/Text/Ink",
          light: "rgb(18, 18, 17)",
          dark: null,
        },
      ],
      collections: [
        {
          id: "posts",
          name: "Posts",
          readonly: false,
          managedBy: "user",
          fields: [
            {
              id: "title",
              name: "Title",
              type: "string",
            },
          ],
          items: [
            {
              id: "p1",
              slug: "first-visit",
              draft: false,
              fieldData: {
                title: {
                  type: "string",
                  value: "Lorem ipsum dolor",
                },
              },
            },
            {
              id: "p2",
              slug: "first-visit-copy",
              draft: false,
              fieldData: {},
            },
          ],
        },
        {
          id: "c2",
          name: "Collection 2",
          readonly: false,
          managedBy: "user",
          fields: [],
          items: [],
        },
      ],
    });
  }

  it("checks a template against Framer's checklist, section by section, reusing the site and layout checks", async () => {
    const { runtime } = project();
    const result = await runOperation(templateAudit, { runtime }, {});
    const bySection = Object.fromEntries(
      result.sections.map(({ section, findings }) => [section, [...new Set(rules(findings))]]),
    );

    expect(bySection).toEqual({
      cms: ["hand-copied-content", "copy-slug", "empty-collection", "collection-name"],
      pages: ["no-404", "no-layout-template", "no-legal-pages"],
      responsive: ["missing-breakpoints", "narrow-grid"],
      layers: ["default-layer-names"],
      text: ["placeholder-text", "old-copyright-year"],
      seo: ["missing-description", "h1-count", "no-social-image", "missing-alt"],
      styles: ["no-text-styles", "unstyled-text", "raw-color"],
      links: ["broken-link"],
      copyright: ["brand-logo"],
    });
    expect(result.sections.flatMap(({ findings }) => findings).every(({ fix }) => fix.length > 0)).toBe(true);
    expect(result.manual.length).toBeGreaterThan(0);
    expect(result.note).toBeNull();
  });

  it("without a Server API key skips what the Plugin API cannot see and says so", async () => {
    const { runtime } = createFakeRuntime(
      {},
      {
        withAgent: false,
        transport: "plugin",
      },
    );
    const result = await runOperation(templateAudit, { runtime }, {});
    const found = result.sections.flatMap(({ findings }) => rules(findings));

    expect(found).toContain("no-404");
    expect(found).not.toContain("no-layout-template");
    expect(result.note).toMatch(/layout templates/);
  });
});
