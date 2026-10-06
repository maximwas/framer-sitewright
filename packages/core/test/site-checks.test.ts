import { describe, expect, it } from "vitest";
import { a11yFindings } from "../src/site-checks/a11y.ts";
import { imageFindings, imagesOf, photoKey } from "../src/site-checks/images.ts";
import { linkFindings, linksOf } from "../src/site-checks/links.ts";
import { seoFindings } from "../src/site-checks/seo.ts";
import { contrastOf } from "../src/site-checks/values.ts";
import type { SerializedNode } from "../src/types/dsl.ts";
import type { CheckedPage, SiteCheckContext } from "../src/types/site-checks.ts";

let ids = 0;

function node(
  type: string,
  name: string,
  attributes: Record<string, unknown> = {},
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

const page = (
  path: string,
  content: SerializedNode,
  attributes: Record<string, unknown> = {},
  complete = true,
): CheckedPage => ({
  path,
  attributes,
  content,
  complete,
});

const context: SiteCheckContext = {
  token: (id) =>
    ({
      ink: "rgb(18, 18, 17)",
      paper: "rgb(251, 250, 247)",
      signal: "rgb(240, 86, 29)",
    })[id] ?? null,
  textStyle: (preset) =>
    ({
      Display: {
        tag: "h1",
        fontSize: 96,
        color: "rgb(18, 18, 17)",
      },
      Body: {
        tag: "p",
        fontSize: 16,
        color: "rgb(94, 91, 85)",
      },
    })[String(preset)] ?? null,
};

const rules = (findings: { rule: string }[]) => findings.map(({ rule }) => rule);

describe("site checks", () => {
  it("finds links that lead nowhere: a missing page, an anchor no layer carries, a mailto without an address", () => {
    const home = page(
      "/",
      node("FrameNode", "Desktop", {}, [
        node("FrameNode", "About", { link: { href: "/about" } }),
        node("FrameNode", "Pricing", { link: { href: "/#pricing" } }),
        node("FrameNode", "Contact", { elementId: "contact" }),
        node("ComponentInstanceNode", "Button", { $control__link: "/#contact" }),
        node("FrameNode", "Mail", { "link.href": "mailto:?subject=Hi" }),
        node("FrameNode", "Call", { link: { href: "tel:+44 20 7946 0123" } }),
        node("FrameNode", "Post", { link: { href: "/blog/:slug" } }),
        node("FrameNode", "Bound", { link: { href: "var(--variable-abc)" } }),
      ]),
    );
    const links = linksOf(home);

    expect(links.map(({ kind }) => kind)).toEqual(["page", "page", "page", "mail", "phone", "page", "variable"]);
    expect(rules(linkFindings([home], links))).toEqual(["broken-link", "missing-anchor", "bad-mailto"]);
  });

  it("skips anchors when the read cannot see them (no Server API key)", () => {
    const home = page(
      "/",
      node("FrameNode", "Desktop", {}, [node("FrameNode", "Pricing", { link: { href: "/#pricing" } })]),
      {},
      false,
    );

    expect(linkFindings([home], linksOf(home))).toEqual([]);
  });

  it("finds the same photo twice and photos without alt text, by file id rather than by URL", () => {
    const content = node("FrameNode", "Desktop", {}, [
      node("FrameNode", "Pill", {
        fill: "https://framerusercontent.com/images/AbC123.jpg?scale-down-to=512",
        altText: "A team lead",
      }),
      node("FrameNode", "Note", { fill: "https://framerusercontent.com/images/AbC123.jpg" }),
      node("ComponentInstanceNode", "Card", { $control__image: "https://framerusercontent.com/images/Zz9.jpg" }),
    ]);
    const images = imagesOf(page("/", content));

    expect(photoKey(images[0]?.url ?? "")).toBe(photoKey(images[1]?.url ?? ""));
    expect(rules(imageFindings(images, true))).toEqual(["repeated-photo", "missing-alt"]);
    expect(rules(imageFindings(images, false))).toEqual(["repeated-photo"]);
  });

  it("checks titles, descriptions, noIndex, duplicate titles, h1 and the site's social image", () => {
    const content = (headings: number) =>
      node(
        "FrameNode",
        "Desktop",
        {},
        Array.from({ length: headings }, () => node("RichTextNode", "Title", { textStylePreset: "Display" })),
      );
    const site = {
      title: "Plain Operation | Operations studio for companies",
      description: null,
      socialImage: null,
      favicon: "https://x/f.svg",
    };
    const findings = seoFindings(
      [
        page("/", content(1), {
          metadata: {
            title: "Plain Operation | Operations studio for companies",
            description:
              "Eight weeks from tangled to written down: an audit, a rebuild and a playbook your team keeps.",
          },
        }),
        page("/about", content(2), {
          metadata: {
            title: "Plain Operation | Operations studio for companies",
            noIndex: true,
          },
        }),
        page("/404", content(0), {
          metadata: {
            title: "Lost",
            noIndex: true,
          },
        }),
      ],
      site,
      context,
    );

    expect(rules(findings)).toEqual([
      "missing-description",
      "no-index",
      "h1-count",
      "title-length",
      "missing-description",
      "h1-count",
      "duplicate-title",
      "no-social-image",
    ]);
  });

  it("regression: a page Framer keeps out of site search after noIndex was turned off is still reported (seen: lab-site)", () => {
    // noIndex=true turns noIndexSite on as well, and noIndex=false leaves it on.
    const content = node("FrameNode", "Desktop", {}, [node("RichTextNode", "Title", { textStylePreset: "Display" })]);
    const findings = seoFindings(
      [
        page("/about", content, {
          metadata: {
            title: "About the studio | Plain",
            noIndex: false,
            noIndexSite: true,
          },
        }),
      ],
      {
        title: null,
        description: null,
        socialImage: "https://x/s.png",
        favicon: "https://x/f.svg",
      },
      context,
    );

    expect(findings.find(({ rule }) => rule === "no-index")?.fix).toMatch(/noIndexSite/);
  });

  it("regression: counts an h1 that its text block gives, without a text style (seen: lab-site)", () => {
    const title = node("RichTextNode", "Title", {}, [node("TextBlock", "", { tag: "h1" })]);
    const findings = seoFindings(
      [page("/", node("FrameNode", "Desktop", {}, [title]), { metadata: { title: "Plain Operation | Studio" } })],
      {
        title: null,
        description: null,
        socialImage: "https://x/s.png",
        favicon: "https://x/f.svg",
      },
      context,
    );

    expect(rules(findings)).not.toContain("h1-count");
  });

  it("finds text that does not stand out from a solid background, and leaves text over photos alone", () => {
    const content = node("FrameNode", "Desktop", { fill: "var(--token-paper)" }, [
      node("FrameNode", "Band", { fill: "var(--token-signal)" }, [
        node("RichTextNode", "Dark on orange", {
          textStylePreset: "Body",
          textColor: "var(--token-ink)",
        }),
        node("RichTextNode", "Grey on orange", { textStylePreset: "Body" }),
      ]),
      node("FrameNode", "Photo", { fill: "https://framerusercontent.com/images/p.jpg" }, [
        node("RichTextNode", "Over the photo", {
          textStylePreset: "Body",
          textColor: "var(--token-paper)",
        }),
      ]),
      node("RichTextNode", "Headline", {
        textStylePreset: "Display",
        textColor: "var(--token-signal)",
      }),
    ]);

    expect(a11yFindings(page("/", content), context).map(({ nodeName }) => nodeName)).toEqual(["Grey on orange"]);
  });

  it("measures contrast like WCAG", () => {
    expect(contrastOf("#000000", "#ffffff")).toEqual({
      ratio: 21,
      aa: true,
      aaLarge: true,
      aaa: true,
    });
    expect(contrastOf("rgb(255, 255, 255)", "rgb(240, 86, 29)")?.aa).toBe(false);
  });
});
