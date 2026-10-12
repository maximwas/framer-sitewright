import { expect, it } from "vitest";
import { HistoryRecorder } from "../src/history/recorder.ts";
import { runOperation } from "../src/operations/define.ts";
import { historyRevert } from "../src/operations/history/revert.ts";
import { nodesLock } from "../src/operations/nodes/lock.ts";
import { nodesQuery } from "../src/operations/nodes/query.ts";
import { createFakeRuntime } from "../src/testing/index.ts";
import type { UndoStep } from "../src/types/history.ts";

// The DSL takes locked="true" and ignores it (seen 12.10.2026), so locking goes through the Plugin API, with a key and
// without one, and so does its undo.
it.each([
  {
    withAgent: true,
    transport: "server-api",
  },
  {
    withAgent: false,
    transport: "plugin",
  },
] as const)("locks layers through the Plugin API ($transport); undo unlocks only those it locked", async (mode) => {
  const { runtime, state } = createFakeRuntime(
    {
      canvas: [
        {
          id: "grain",
          parentId: "breakpoint-desktop",
          className: "ComponentInstanceNode",
          name: "Grain",
          attributes: { locked: false },
        },
        {
          id: "grid",
          parentId: "breakpoint-desktop",
          className: "FrameNode",
          name: "Grid",
          attributes: { locked: true },
        },
      ],
    },
    mode,
  );
  const lockedIds = () => state.canvas.filter((layer) => layer.attributes?.locked === true).map((layer) => layer.id);
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
  const locked = await runOperation(
    nodesLock,
    {
      runtime,
      history,
    },
    {
      nodeIds: ["grain", "grid", "nope"],
      locked: true,
    },
  );

  expect(locked).toMatchObject({
    locked: true,
    changed: [
      {
        id: "grain",
        name: "Grain",
      },
    ],
    unchanged: ["grid"],
    missing: ["nope"],
  });
  expect(lockedIds()).toEqual(["grain", "grid"]);

  // nodes_query reads it too.
  const query = await runOperation(
    nodesQuery,
    { runtime },
    {
      where: [
        {
          attribute: "locked",
          op: "equals",
          value: "true",
        },
      ],
    },
  );

  expect(query.matches.map((match) => match.id)).toEqual(["grain", "grid"]);

  const undone = await revert(history.steps);

  expect(undone.outcomes).toEqual(["restored"]);
  expect(lockedIds()).toEqual(["grid"]);

  const redone = await revert(undone.steps);

  expect(redone.outcomes).toEqual(["restored"]);
  expect(lockedIds()).toEqual(["grain", "grid"]);
});
