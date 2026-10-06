import { expect, it } from "vitest";
import { itemPageUrl, parseMarketplaceItem, parseMarketplacePage } from "../src/utils/marketplace.ts";

/** A page as Framer serves it: the items in a Next.js data script, each string escaped once more. */
function page(items: readonly object[]): string {
  const chunk = JSON.stringify(`5:["$","div",null,{"items":${JSON.stringify(items)}}]`).slice(1, -1);

  return [
    '<a href="/marketplace/components/categories/carousels/">Carousels</a>',
    '<a href="/marketplace/templates/categories/agency/">Agency</a>',
    `<script>self.__next_f.push([1,"${chunk}"])</script>`,
  ].join("");
}

it("reads the Marketplace's items and categories, with a module URL only for free components", () => {
  const listing = parseMarketplacePage(
    page([
      {
        id: "xxSysdSEkARjRD8RzyQg",
        title: "Arc Card Carousel",
        slug: "arc-card-carousel",
        author: { name: "Vishal AN" },
        media: [
          {
            type: "image",
            url: "https://example.com/arc.png",
          },
        ],
        type: "component",
        attributes: {
          price: null,
          paymentUrl: null,
          remixUrl: "$undefined",
          previewUrl: "https://first-turnip-072135.framer.app/",
          url: "https://framer.com/m/ArcCardCarousel-1dvmlj.js@v1upKuQR8rveRRgNjnpY",
        },
      },
      {
        // Templates have short numeric ids.
        id: "59533",
        title: "Neiden",
        slug: "neiden",
        author: { name: "Førde" },
        media: [],
        type: "template",
        attributes: {
          price: "$99",
          previewUrl: "https://neiden.framer.media/",
          url: "https://framer.com/m/x.js",
        },
      },
    ]),
  );

  expect(listing.categories).toEqual(["carousels", "agency"]);
  expect(listing.items).toEqual([
    {
      title: "Arc Card Carousel",
      slug: "arc-card-carousel",
      author: "Vishal AN",
      kind: "component",
      price: null,
      pageUrl: "https://www.framer.com/marketplace/components/arc-card-carousel/",
      previewUrl: "https://first-turnip-072135.framer.app/",
      thumbnail: "https://example.com/arc.png",
      moduleUrl: "https://framer.com/m/ArcCardCarousel-1dvmlj.js@v1upKuQR8rveRRgNjnpY",
      remixUrl: null,
    },
    {
      title: "Neiden",
      slug: "neiden",
      author: "Førde",
      kind: "template",
      price: "$99",
      pageUrl: "https://www.framer.com/marketplace/templates/neiden/",
      previewUrl: "https://neiden.framer.media/",
      thumbnail: null,
      moduleUrl: null,
      remixUrl: null,
    },
  ]);
});

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
