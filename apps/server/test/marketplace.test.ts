import { expect, it } from "vitest";
import { itemPageUrl, parseMarketplaceItem } from "../src/utils/marketplace.ts";

it("reads an item page: the author's description by its byte length, categories, dates, and a free component's module", () => {
  // A dash takes three bytes: a text chunk's length counts bytes, and the next chunk follows without a break.
  const description = "<p>Slides stack as you drag — any layer can be one.</p><ul><li>Arrows &amp; dots</li></ul>";
  const resource = {
    id: "u2kjtN0xb1Xa",
    resolved: true,
    title: "Stacked Slider",
    slug: "stacked-slider",
    author: { name: "Nandi" },
    media: [],
    type: "component",
    body: "$44",
    updatedAt: "2026-09-01T10:00:00.000Z",
    publishedAt: "2025-01-03T10:00:00.000Z",
    attributes: {
      price: "0",
      previewUrl: "https://stacked.framer.website/",
      url: "https://framer.com/m/StackedSlider-x1.js@abc",
      categories: [{ name: "Carousels" }, { name: "Interactive" }],
    },
  };
  const html = [
    `5:["$","div",null,{"resource":${JSON.stringify(resource)}}]\n`,
    `44:T${Buffer.byteLength(description).toString(16)},${description}`,
    '6:["$","footer",null,{}]\n',
  ]
    .map((chunk) => `<script>self.__next_f.push([1,${JSON.stringify(chunk)}])</script>`)
    .join("");

  expect(parseMarketplaceItem(html)).toEqual({
    title: "Stacked Slider",
    slug: "stacked-slider",
    kind: "component",
    author: "Nandi",
    price: null,
    pageUrl: "https://www.framer.com/marketplace/components/stacked-slider/",
    previewUrl: "https://stacked.framer.website/",
    moduleUrl: "https://framer.com/m/StackedSlider-x1.js@abc",
    remixUrl: null,
    categories: ["Carousels", "Interactive"],
    updatedAt: "2026-09-01T10:00:00.000Z",
    publishedAt: "2025-01-03T10:00:00.000Z",
    description: "Slides stack as you drag — any layer can be one.\n- Arrows & dots",
  });
});

it("takes an item as a link, a marketplace path or a bare component slug", () => {
  expect(itemPageUrl("https://framer.com/marketplace/components/stacked-slider/?via=maxim")).toBe(
    "https://www.framer.com/marketplace/components/stacked-slider/",
  );
  expect(itemPageUrl("templates/neiden")).toBe("https://www.framer.com/marketplace/templates/neiden/");
  expect(itemPageUrl("stacked-slider")).toBe("https://www.framer.com/marketplace/components/stacked-slider/");
  expect(itemPageUrl("https://example.com/stacked-slider")).toBeNull();
});
