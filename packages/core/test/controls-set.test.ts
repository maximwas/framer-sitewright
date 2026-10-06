import { expect, it } from "vitest";
import { componentControlsSet } from "../src/operations/components/controls-set.ts";
import { runOperation } from "../src/operations/define.ts";
import { createFakeRuntime } from "../src/testing/index.ts";
import type { FramerRuntime } from "../src/types/framer.ts";

it("regression: says which controls Framer did not keep, instead of echoing the request (seen: a transition object)", async () => {
  const { runtime, state } = createFakeRuntime({
    instanceControls: {
      slider: {
        gap: 20,
        arrows: {
          show: true,
          size: 40,
        },
        transition: { type: "tween" },
      },
    },
  });
  // Like the Stacking Slider: the transition object is refused without an error, the rest is kept.
  const refusing: FramerRuntime = {
    ...runtime,
    port: {
      ...runtime.port,
      getNode: async (nodeId) => {
        const node = (await runtime.port.getNode(nodeId)) as { controls: Record<string, unknown> } | null;

        return node === null
          ? null
          : {
              ...node,
              setAttributes: async ({ controls }: { controls: Record<string, unknown> }) => {
                state.instanceControls[nodeId] = {
                  ...controls,
                  transition: { type: "tween" },
                };
              },
            };
      },
    },
  };
  const result = await runOperation(
    componentControlsSet,
    { runtime: refusing },
    {
      nodeId: "slider",
      controls: {
        transition: {
          type: "spring",
          stiffness: 400,
        },
        arrows: { show: false },
      },
    },
  );

  expect(result.notStored).toEqual(["transition"]);
  expect(result.controls).toMatchObject({
    arrows: {
      show: false,
      size: 40,
    },
    transition: { type: "tween" },
  });
});
