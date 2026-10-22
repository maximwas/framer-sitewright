import { expect, it } from "vitest";
import { withComponentFacts } from "../src/utils/component-controls.ts";

it("regression: lists the variants and option values the component really has (seen: Variant 3 for Slide 3, an enum without values)", () => {
  // What readComponentControls answered, and what the component node holds.
  const controls = {
    controls: {
      $control__variant: {
        type: "enum",
        options: ["Slide 1", "Slide 2", "Variant 3"],
        id: "variant",
      },
      $control__tone: {
        type: "enum",
        id: "TpQmECGWC",
      },
      $control__image: {
        type: "responsiveimage",
        id: "VLV00uAY1",
      },
      $control__accent: { type: "rgba(r, g, b, a) | color(display-p3 r g b / a) | #rrggbb | var(--token-${id})" },
    },
  };
  const node = {
    type: "ComponentNode",
    id: "u00K2wjie",
    name: "Lab/Carousel",
    $variants: [
      {
        id: "KM_Ng4GIj",
        name: "Slide 1",
      },
      {
        id: "kZqCrs5L1",
        name: "Slide 2",
      },
      {
        id: "mKXefQ77h",
        name: "Slide 3",
      },
      // A hover variant carries its base's name: it is no option of its own (seen: ["Default", "Active", "Default"]).
      {
        id: "hov1",
        name: "Slide 1",
      },
    ],
    variables: [
      {
        key: "$control__tone",
        name: "Tone",
        type: "option",
        cases: ["New", "Popular", "Sale"],
        initialValue: "New",
      },
      {
        key: "$control__image",
        name: "Image",
        type: "image",
      },
      {
        key: "$control__accent",
        name: "Accent",
        type: "color",
        initialValue: "var(--token-cf39)",
      },
    ],
  };

  expect(withComponentFacts(controls, node)).toEqual({
    controls: {
      $control__variant: {
        type: "enum",
        options: ["Slide 1", "Slide 2", "Slide 3"],
        id: "variant",
      },
      $control__tone: {
        type: "enum",
        id: "TpQmECGWC",
        name: "Tone",
        options: ["New", "Popular", "Sale"],
        defaultValue: "New",
      },
      $control__image: {
        type: "image",
        id: "VLV00uAY1",
        name: "Image",
        write: '$control__image.src="<image url>" $control__image.alt="<alt text>"',
      },
      $control__accent: {
        type: "color",
        name: "Accent",
        defaultValue: "var(--token-cf39)",
      },
    },
  });
});

it("regression: says how to write a link control, a link to a CMS page included (seen: an item id refused)", () => {
  // The type as readComponentControls gives it (seen 22.10.2026 on Lab/Button, shortened), not "link".
  const type =
    'External URL | internal page path | CMS detail page path with a dynamic path variable like ":slug" (must also pass link.collectionItem) | ComputedValue<link> | null';
  const read = withComponentFacts({ controls: { $control__link: { type } } }, { type: "ComponentNode" });

  expect(read).toEqual({
    controls: {
      $control__link: {
        type,
        write:
          '$control__link.href="<url or /page path>"; a CMS page: $control__link.href="/<collection path>/:slug" $control__link.collectionItem="<item slug>"',
      },
    },
  });
});
