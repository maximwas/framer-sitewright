import { expect, it } from "vitest";
import { tokenSwaps } from "../src/utils/token-swap.ts";

it("rewrites every attribute that names the old token, in gradients and borders too, and leaves the rest", () => {
  // Framer's serialize() keeps a node's values under attributes.
  expect(
    tokenSwaps(
      [
        {
          type: "FrameNode",
          id: "a",
          attributes: {
            fill: "var(--token-old)",
            radius: "8px",
          },
        },
        {
          type: "FrameNode",
          id: "b",
          attributes: { fill: "linear-gradient(90deg, var(--token-old) 0%, var(--token-keep) 100%)" },
        },
        {
          type: "RichTextNode",
          id: "c",
          attributes: { textColor: "var(--token-keep)" },
        },
        {
          type: "TextRun",
          id: "v:c:0:0",
          attributes: { textColor: "var(--token-old)" },
        },
      ],
      "old",
      "new",
    ),
  ).toEqual({
    changes: [
      {
        id: "a",
        attributes: { fill: "var(--token-new)" },
      },
      {
        id: "b",
        attributes: { fill: "linear-gradient(90deg, var(--token-new) 0%, var(--token-keep) 100%)" },
      },
    ],
    insideText: ["c"],
  });
});
