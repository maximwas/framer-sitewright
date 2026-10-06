import { expect, it } from "vitest";
import { runOperation } from "../src/operations/define.ts";
import { stylesCopy } from "../src/operations/nodes/copy-styles.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

it("copies only the attributes of the chosen groups that the source has, to every target in one batch", async () => {
  const { runtime, state } = createFakeRuntime({
    serializedNodes: {
      card: {
        type: "FrameNode",
        id: "card",
        fill: "var(--token-surface)",
        radius: "16px",
        width: "320px",
      },
    },
  });

  const copied = await runOperation(
    stylesCopy,
    { runtime },
    {
      sourceId: "card",
      targetIds: ["a", "b"],
      categories: ["color", "radius"],
    },
  );

  expect(copied.copied).toEqual({
    fill: "var(--token-surface)",
    radius: "16px",
  });
  expect(state.appliedDsl.at(-1)).toBe(
    'SET a fill="var(--token-surface)" radius="16px";\nSET b fill="var(--token-surface)" radius="16px";',
  );
});
