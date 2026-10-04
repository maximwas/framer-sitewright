import { expect, it } from "vitest";
import { HistoryRecorder } from "../src/history/recorder.ts";
import { runOperation } from "../src/operations/define.ts";
import { historyRevert } from "../src/operations/history/revert.ts";
import { breakpointsAdd } from "../src/operations/nodes/breakpoints.ts";
import { createFakeRuntime } from "../src/testing/index.ts";
import type { UndoStep } from "../src/types/history.ts";

it("adds the breakpoints a page lacks without a key; undo takes them away and redo brings them back", async () => {
  const { runtime, state } = createFakeRuntime(
    {
      breakpoints: [
        {
          id: "desktop",
          name: "Desktop",
          width: 1440,
        },
      ],
    },
    {
      withAgent: false,
      transport: "plugin",
    },
  );
  const revert = async (steps: readonly UndoStep[]) => {
    const history = new HistoryRecorder();
    const output = await runOperation(
      historyRevert,
      {
        runtime,
        history,
      },
      { steps: [...steps] },
    );

    return {
      outcomes: output.results.map((result) => result.outcome),
      steps: [...history.steps],
    };
  };
  const history = new HistoryRecorder();
  const added = await runOperation(
    breakpointsAdd,
    {
      runtime,
      history,
    },
    {
      breakpoints: [
        {
          name: "Tablet",
          width: 810,
        },
        {
          name: "Phone",
          width: 390,
        },
        {
          name: "Wide",
          width: 1440,
        },
      ],
    },
  );
  const widths = () => state.breakpoints.map(({ name, width }) => `${name} ${width}`).sort();

  // The width the page has already is left alone.
  expect(added.breakpoints.map(({ name, width, primary, added: isNew }) => [name, width, primary, isNew])).toEqual([
    ["Desktop", 1440, true, false],
    ["Tablet", 810, false, true],
    ["Phone", 390, false, true],
  ]);

  const undone = await revert(history.steps);

  expect(undone.outcomes).toEqual(["deleted", "deleted"]);
  expect(widths()).toEqual(["Desktop 1440"]);

  // Redo recreates them as copies of the primary breakpoint, with their names and widths.
  const redone = await revert(undone.steps);

  expect(redone.outcomes).toEqual(["recreated", "recreated"]);
  expect(widths()).toEqual(["Desktop 1440", "Phone 390", "Tablet 810"]);
});
