import { expect, it } from "vitest";
import { previewImagesIn } from "../src/utils/text.ts";

it("regression: shows an image the XML wrote with &amp; by its real URL (seen: an Unsplash social image)", () => {
  expect(
    previewImagesIn(
      '<WebPageNode metadata.socialImage="https://images.unsplash.com/photo-1?crop=entropy&amp;fm=jpg" />',
    ),
  ).toEqual(["https://images.unsplash.com/photo-1?crop=entropy&fm=jpg"]);
});
