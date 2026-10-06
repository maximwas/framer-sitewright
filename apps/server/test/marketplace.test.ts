import { expect, it } from "vitest";
import { parseMarketplacePage } from "../src/utils/marketplace.ts";

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
