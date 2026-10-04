import { expect, it } from "vitest";
import { componentControlsSet } from "../src/operations/components/controls-set.ts";
import { runOperation } from "../src/operations/define.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

it("sets a code component's object control field by field, keeping the fields not given", async () => {
  const { runtime, state } = createFakeRuntime();

  state.instanceControls.carousel = {
    gap: 16,
    arrows: {
      show: true,
      fill: "rgba(0, 0, 0, 0.4)",
      radius: "40px",
    },
  };

  await runOperation(
    componentControlsSet,
    { runtime },
    {
      nodeId: "carousel",
      controls: {
        arrows: { fill: "rgb(248, 247, 238)" },
        dots: { show: false },
      },
    },
  );

  expect(state.instanceControls.carousel).toEqual({
    gap: 16,
    arrows: {
      show: true,
      fill: "rgb(248, 247, 238)",
      radius: "40px",
    },
    dots: { show: false },
  });
  await expect(
    runOperation(
      componentControlsSet,
      { runtime },
      {
        nodeId: "missing",
        controls: {},
      },
    ),
  ).rejects.toThrow(/No component instance/);
});
