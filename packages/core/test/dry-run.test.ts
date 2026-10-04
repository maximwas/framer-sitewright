import { expect, it } from "vitest";
import { colorTokensUpsert } from "../src/operations/color-tokens/upsert.ts";
import { runOperation } from "../src/operations/define.ts";
import { textStylesUpsert } from "../src/operations/text-styles/upsert.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

const BRAND_TEXT = {
  id: "tok-text",
  name: "Text",
  path: "/Brand/Text",
  light: "rgb(15, 23, 42)",
  dark: null,
};

it.each([
  {
    via: "dsl",
    dsl: '+ColorStyleTokenNode token0 name="Brand/New" light="rgb(0, 0, 0)";\nSET tok-text light="rgb(255, 255, 255)";',
  },
  {
    via: "plugin-api",
    dsl: "",
  },
] as const)("dryRun returns the plan and writes nothing via $via", async ({ via, dsl }) => {
  const { runtime, state } = createFakeRuntime({ colorStyles: [BRAND_TEXT] });
  const tokens = await runOperation(
    colorTokensUpsert,
    { runtime },
    {
      via,
      dryRun: true,
      tokens: [
        {
          path: "Brand/Text",
          light: "#fff",
        },
        {
          path: "Brand/New",
          light: "#000",
        },
      ],
    },
  );
  const styles = await runOperation(
    textStylesUpsert,
    { runtime },
    {
      via,
      dryRun: true,
      styles: [
        {
          path: "Body",
          fontSize: "16px",
          color: { token: "Brand/Text" },
        },
      ],
    },
  );

  expect(tokens).toMatchObject({
    created: [
      {
        path: "Brand/New",
        id: null,
      },
    ],
    updated: [
      {
        path: "Brand/Text",
        id: "tok-text",
      },
    ],
    dsl,
    diagnostics: null,
  });
  expect(styles).toMatchObject({
    created: [
      {
        path: "Body",
        id: null,
      },
    ],
    diagnostics: null,
  });
  expect(state).toMatchObject({
    colorStyles: [BRAND_TEXT],
    textStyles: [],
    appliedDsl: [],
  });
});
