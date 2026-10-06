import { expect, it } from "vitest";
import { shadersRead } from "../src/operations/assets/shaders-read.ts";
import { componentsRead } from "../src/operations/components/components-read.ts";
import { runOperation } from "../src/operations/define.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

it("lists Framer's own components with their ids, which design_apply places like the project's", async () => {
  const { runtime } = createFakeRuntime({
    builtinComponents: [
      {
        id: "lRDHiNWNVWmE0lqtoVHP",
        displayName: "Video",
        keywords: "video player",
      },
    ],
  });
  const result = await runOperation(componentsRead, { runtime }, { ids: [] });

  expect(result.framer).toEqual([
    {
      id: "lRDHiNWNVWmE0lqtoVHP",
      name: "Video",
      keywords: "video player",
    },
  ]);
});

it("lists the shaders Framer offers, and reads the controls of the ones asked for", async () => {
  // getContext()'s <available-shaders>, as Framer writes it (06.10.2026).
  const { runtime } = createFakeRuntime({
    agentContext: [
      "<project-fonts>Inter</project-fonts>",
      "<available-shaders>",
      "### Current Site Shaders",
      '[{"name":"liquid-gradient","title":"Liquid Gradient"}]',
      "### Additionally Available Shaders",
      '[{"name":"fluted-glass","title":"Fluted Glass","keywords":"shader glass"}]',
      "</available-shaders>",
    ].join("\n"),
    shaderControls: {
      "liquid-gradient": {
        colors: {
          type: "array",
          maxCount: 8,
        },
      },
    },
  });

  expect(await runOperation(shadersRead, { runtime }, {})).toEqual({
    shaders: [
      {
        name: "liquid-gradient",
        title: "Liquid Gradient",
        keywords: null,
        onSite: true,
        controls: null,
      },
      {
        name: "fluted-glass",
        title: "Fluted Glass",
        keywords: "shader glass",
        onSite: false,
        controls: null,
      },
    ],
  });
  expect(await runOperation(shadersRead, { runtime }, { names: ["liquid-gradient"] })).toMatchObject({
    shaders: [
      {
        name: "liquid-gradient",
        controls: {
          colors: {
            type: "array",
            maxCount: 8,
          },
        },
      },
    ],
  });
});
