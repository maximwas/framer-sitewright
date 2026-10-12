import { expect, it } from "vitest";
import { runOperation } from "../src/operations/define.ts";
import { designApply } from "../src/operations/design/apply.ts";
import { nodesRead } from "../src/operations/nodes/read.ts";
import { createFakeRuntime } from "../src/testing/index.ts";
import type { FramerRuntime } from "../src/types/framer.ts";

/**
 * A project with one instance whose Border control is set per side, as Framer has it: serialize prints the control as
 * one width (seen 12.10.2026), the plugin keys its controls by variable id and reads a token back as its color.
 */
function borderProject() {
  const stored: Record<string, unknown> = {
    QURtWbmH5: {
      borderColor: "var(--token-line)",
      borderStyle: "solid",
      borderTopWidth: 0,
      borderRightWidth: 0,
      borderBottomWidth: 1,
      borderLeftWidth: 1,
    },
  };
  const { runtime: base, state } = createFakeRuntime({
    colorStyles: [
      {
        id: "line",
        name: "Line",
        path: "/Line",
        light: "rgb(229, 229, 229)",
        dark: null,
      },
    ],
    serializedNodes: {
      card: {
        type: "ComponentInstanceNode",
        id: "card",
        component: "cmp9",
        attributes: {
          $control__border: "1px solid var(--token-line)",
          $control__title: "Revenue",
        },
      },
    },
  });
  const runtime: FramerRuntime = {
    ...base,
    port: {
      ...base.port,
      getNode: async (nodeId) => {
        if (nodeId === "cmp9") {
          return {
            id: "cmp9",
            getVariables: async () => [
              {
                id: "QURtWbmH5",
                name: "Border",
                type: "border",
              },
            ],
          };
        }

        return nodeId === "card"
          ? {
              id: "card",
              componentIdentifier: "local-module:canvasComponent/cmp9:default",
              controls: JSON.parse(JSON.stringify(stored).replaceAll("var(--token-line)", "rgb(229, 229, 229)")),
              setAttributes: async ({ controls }: { controls: Record<string, unknown> }) => {
                Object.assign(stored, controls);
              },
            }
          : null;
      },
    },
  };

  return {
    runtime,
    state,
    stored,
  };
}

it("regression: nodes_read shows a border control's sides, which serialize hides (seen: Stat Card read as 1px solid)", async () => {
  const { runtime } = borderProject();
  const read = await runOperation(nodesRead, { runtime }, { nodeId: "card" });

  expect(read.xml).toContain('$control__border="0px 0px 1px 1px solid var(--token-line)"');
  expect(read.xml).toContain('$control__title="Revenue"');
});

it("regression: design_apply writes a border control per side through the plugin, which the DSL refuses", async () => {
  const { runtime, state, stored } = borderProject();

  stored.QURtWbmH5 = {
    borderColor: "rgb(0, 0, 0)",
    borderStyle: "solid",
    borderWidth: 1,
  };

  const result = await runOperation(
    designApply,
    { runtime },
    { xml: '<ComponentInstanceNode id="card" $control__border="1px 0 0 0 dashed var(--token-line)" name="Card" />' },
  );

  expect(state.appliedDsl.at(-1)).toBe('SET card name="Card";');
  expect(stored.QURtWbmH5).toEqual({
    borderColor: "var(--token-line)",
    borderStyle: "dashed",
    borderTopWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  });
  expect(result.errors).toEqual([]);
});
