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

it("regression: uploads the images a carousel's list takes, which Framer drops as URLs (seen: 7 of 8 carousels kept demo photos)", async () => {
  const { runtime, state } = createFakeRuntime({ instanceControls: { carousel: { slides: [] } } });
  const result = await runOperation(
    componentControlsSet,
    { runtime },
    {
      nodeId: "carousel",
      controls: {
        slides: [{ image: "https://images.unsplash.com/photo-1?w=1200", caption: "Cup 1" }],
        imageUrl: "https://example.com/plain-string.jpg",
      },
    },
  );
  const slides = state.instanceControls.carousel?.slides as { image: unknown; caption: string }[];

  expect(state.uploadedImages.map(({ url }) => url)).toEqual(["https://images.unsplash.com/photo-1?w=1200"]);
  expect(slides[0]).toEqual({ image: { id: state.uploadedImages[0]?.id, url: "https://images.unsplash.com/photo-1?w=1200" }, caption: "Cup 1" });
  // A control that takes the URL as text keeps it as text.
  expect(state.instanceControls.carousel?.imageUrl).toBe("https://example.com/plain-string.jpg");
  expect(result.notStored).toEqual([]);
});

