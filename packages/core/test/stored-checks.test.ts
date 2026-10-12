import { expect, it } from "vitest";
import { runOperation } from "../src/operations/define.ts";
import { designApply } from "../src/operations/design/apply.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

it("regression: warns that a variant keeps no override equal to what it inherits (seen: it then followed the primary)", async () => {
  const { runtime, state } = createFakeRuntime();

  state.serializedNodes.GB4maSsZErZVv6ozZg = {
    type: "FrameNode",
    id: "GB4maSsZErZVv6ozZg",
    $replicaId: "GB4maSsZE",
    attributes: {
      fill: "rgb(0, 0, 0)",
      width: "10px",
    },
  };

  const result = await runOperation(
    designApply,
    { runtime },
    { dsl: 'SET GB4maSsZErZVv6ozZg fill="#000000" width="12px";' },
  );

  expect(result.warnings).toEqual([
    {
      message: expect.stringMatching(/inherits: fill="#000000"/),
      targets: ["GB4maSsZErZVv6ozZg"],
    },
  ]);
});

it("regression: says when a SET left a value as it was (seen: writes Framer dropped without an error)", async () => {
  const { runtime, state } = createFakeRuntime();

  state.serializedNodes.card = {
    type: "FrameNode",
    id: "card",
    attributes: {
      opacity: "0.5",
      width: "100px",
    },
  };
  // Framer answers cleanly and changes nothing.
  state.nextApplyResult = { message: "Commands applied cleanly." };

  const dropped = await runOperation(designApply, { runtime }, { dsl: 'SET card opacity="0" width="100px";' });

  expect(dropped.warnings).toEqual([
    {
      message: expect.stringMatching(/opacity="0".*0\.5/),
      targets: ["card"],
    },
  ]);

  // Stored: no warning.
  const stored = await runOperation(designApply, { runtime }, { dsl: 'SET card opacity="0";' });

  expect(stored.warnings).toEqual([]);
});

it("warns about variant changes that jump on the site: to 0px, opacity on a blurred layer, opacity under an appear effect", async () => {
  const { runtime, state } = createFakeRuntime();
  const replica = (id: string, attributes: Record<string, string>) => {
    state.serializedNodes[id] = {
      type: "FrameNode",
      id,
      $replicaId: "hover",
      attributes,
    };
  };

  replica("hoverbar", { width: "120px" });
  replica("hoverglass", {
    backgroundBlur: "12px",
    opacity: "1",
  });
  replica("hovercard", {
    "appearEffect.trigger": "onInView",
    opacity: "1",
  });

  const result = await runOperation(
    designApply,
    { runtime },
    { dsl: 'SET hoverbar width="0px";\nSET hoverglass opacity="0";\nSET hovercard opacity="0.4";' },
  );

  expect(result.warnings.map(({ targets, message }) => [targets[0], message.split(":")[0]])).toEqual([
    ["hoverbar", "In a variant change, a size animated to 0px does not ease on the site"],
    ["hoverglass", "In a variant change, background blur does not fade with opacity"],
    [
      "hovercard",
      "In a variant change, an appear effect on the layer takes over its opacity, so the change will not animate it. Put the appear effect on a wrapper and change the opacity of the layer inside.",
    ],
  ]);
});
