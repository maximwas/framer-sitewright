import { expect, it } from "vitest";
import { relatedItems } from "../src/utils/interlink.ts";

it("ranks related items by category, shared tags and keyword words, never the item itself", () => {
  const items = [
    {
      slug: "a",
      category: "Ops",
      tags: ["hiring", "sops"],
      keyword: "onboarding checklist",
    },
    {
      slug: "b",
      category: "Ops",
      tags: ["sops"],
      keyword: "warehouse layout",
    },
    {
      slug: "c",
      category: "Finance",
      tags: ["hiring"],
      keyword: "onboarding costs",
    },
    {
      slug: "d",
      category: "Finance",
      tags: [],
      keyword: "month end",
    },
  ];

  // b: same category 3 + one tag 2 = 5; c: one tag 2 + "onboarding" 1 = 3; d: nothing in common.
  expect(relatedItems(items, 2).get("a")).toEqual(["b", "c"]);
  expect(relatedItems(items, 3).get("d")).toEqual(["c"]);
});
