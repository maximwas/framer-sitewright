import { expect, it } from "vitest";
import { HistoryRecorder } from "../src/history/recorder.ts";
import { componentBorderVariableAdd } from "../src/operations/components/border-variable-add.ts";
import { runOperation } from "../src/operations/define.ts";
import { createFakeRuntime } from "../src/testing/index.ts";
import type { FramerRuntime } from "../src/types/framer.ts";

// The DSL refuses a border-type variable (seen 12.10.2026); ComponentNode.addVariables makes one.
it("adds a border variable to a component from a CSS-like default, its token as the color style", async () => {
  const { runtime: base } = createFakeRuntime({
    colorStyles: [
      {
        id: "line",
        name: "Line",
        path: "/Line",
        light: "rgb(229, 229, 229)",
        dark: null,
      },
    ],
  });
  const added: unknown[] = [];
  const runtime: FramerRuntime = {
    ...base,
    port: {
      ...base.port,
      getNode: async (nodeId) =>
        nodeId === "card"
          ? {
              id: "card",
              __class: "ComponentNode",
              addVariables: async (variables: unknown[]) => {
                added.push(...variables);

                return [
                  {
                    id: "QURtWbmH5",
                    name: "Border",
                    type: "border",
                  },
                ];
              },
            }
          : null,
    },
  };
  const history = new HistoryRecorder();
  const result = await runOperation(
    componentBorderVariableAdd,
    {
      runtime,
      history,
    },
    {
      componentId: "card",
      name: "Border",
      default: "0 0 1px 0 solid var(--token-line)",
    },
  );

  expect(added).toEqual([
    {
      type: "border",
      name: "Border",
      defaultValue: {
        width: "0px 0px 1px 0px",
        style: "solid",
        color: expect.objectContaining({ id: "line" }),
      },
    },
  ]);
  expect(result).toMatchObject({
    variableId: "QURtWbmH5",
    bind: 'border="var(--variable-QURtWbmH5)"',
  });
  expect(history.incomplete).toMatch(/undo/i);
});
