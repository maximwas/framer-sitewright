import { describe, expect, it } from "vitest";
import { colorTokensDelete } from "../src/operations/color-tokens/delete.ts";
import { colorTokensUpsert } from "../src/operations/color-tokens/upsert.ts";
import { runOperation } from "../src/operations/define.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

describe("colorTokens.upsert", () => {
  it("creates new tokens through one DSL call and returns canonical ids", async () => {
    const { runtime, state } = createFakeRuntime();
    const result = await runOperation(
      colorTokensUpsert,
      { runtime },
      {
        tokens: [
          {
            path: "Brand/Primary",
            light: "#2563eb",
            dark: "#60a5fa",
          },
          {
            path: "Brand/Accent",
            light: "red",
          },
        ],
      },
    );

    expect(state.appliedDsl).toEqual([
      '+ColorStyleTokenNode token0 name="Brand/Primary" light="rgb(37, 99, 235)" dark="rgb(96, 165, 250)";\n' +
        '+ColorStyleTokenNode token1 name="Brand/Accent" light="rgb(255, 0, 0)";',
    ]);
    expect(result.created).toEqual([
      {
        path: "Brand/Primary",
        id: "color-1",
      },
      {
        path: "Brand/Accent",
        id: "color-2",
      },
    ]);
  });

  it("is idempotent: the same input changes nothing", async () => {
    const { runtime, state } = createFakeRuntime();
    const input = {
      tokens: [
        {
          path: "Brand/Primary",
          light: "#2563eb",
          dark: "#60a5fa",
        },
      ],
    };

    await runOperation(colorTokensUpsert, { runtime }, input);

    const second = await runOperation(colorTokensUpsert, { runtime }, input);

    expect(state.appliedDsl).toHaveLength(1);
    expect(second.unchanged).toEqual([
      {
        path: "Brand/Primary",
        id: "color-1",
      },
    ]);
  });

  it("updates only changed channels and can remove dark", async () => {
    const { runtime, state } = createFakeRuntime();

    await runOperation(
      colorTokensUpsert,
      { runtime },
      {
        tokens: [
          {
            path: "A/B",
            light: "#000",
            dark: "#fff",
          },
        ],
      },
    );
    await runOperation(
      colorTokensUpsert,
      { runtime },
      {
        tokens: [
          {
            path: "A/B",
            light: "#111",
          },
        ],
      },
    );
    await runOperation(
      colorTokensUpsert,
      { runtime },
      {
        tokens: [
          {
            path: "A/B",
            light: "#111",
            dark: null,
          },
        ],
      },
    );
    expect(state.appliedDsl.slice(1)).toEqual(['SET color-1 light="rgb(17, 17, 17)";', 'SET color-1 dark="null";']);
  });

  it("rejects duplicate paths and invalid colors before calling Framer", async () => {
    const { runtime, state } = createFakeRuntime();
    const duplicates = {
      tokens: [
        {
          path: "A/B",
          light: "#000",
        },
        {
          path: " /A/B/ ",
          light: "#fff",
        },
      ],
    };

    await expect(runOperation(colorTokensUpsert, { runtime }, duplicates)).rejects.toThrow(/Duplicate/);
    await expect(
      runOperation(
        colorTokensUpsert,
        { runtime },
        {
          tokens: [
            {
              path: "A/B",
              light: "nope",
            },
          ],
        },
      ),
    ).rejects.toThrow(/Unrecognized color/);
    expect(state.appliedDsl).toEqual([]);
  });

  it("writes through the Plugin API when there is no framer.agent (plugin transport)", async () => {
    const { runtime, state } = createFakeRuntime(
      {},
      {
        withAgent: false,
        transport: "plugin",
      },
    );
    const first = await runOperation(
      colorTokensUpsert,
      { runtime },
      {
        tokens: [
          {
            path: "Brand/Primary",
            light: "#2563eb",
            dark: "#60a5fa",
          },
        ],
      },
    );

    expect(first).toMatchObject({
      via: "plugin-api",
      created: [
        {
          path: "Brand/Primary",
          id: "color-1",
        },
      ],
    });
    await runOperation(
      colorTokensUpsert,
      { runtime },
      {
        tokens: [
          {
            path: "Brand/Primary",
            light: "#000",
            dark: null,
          },
        ],
      },
    );
    expect(state.colorStyles).toEqual([
      {
        id: "color-1",
        name: "Primary",
        path: "/Brand/Primary",
        light: "rgb(0, 0, 0)",
        dark: null,
      },
    ]);
    expect(state.appliedDsl).toEqual([]);
  });

  it("regression: deletes a token once when its path repeats in one call", async () => {
    const { runtime, state } = createFakeRuntime();

    await runOperation(
      colorTokensUpsert,
      { runtime },
      {
        tokens: [
          {
            path: "A/B",
            light: "#000",
          },
        ],
      },
    );

    const result = await runOperation(colorTokensDelete, { runtime }, { paths: ["A/B", " /A/B/ "] });

    expect(result).toMatchObject({
      deleted: [
        {
          path: "A/B",
          id: "color-1",
        },
      ],
      diagnostics: { ok: true },
    });
    expect(state.appliedDsl.at(-1)).toBe("DEL color-1;");
  });

  it("regression: never reuses DSL temp ids in one session (Framer rejects them even after DEL)", async () => {
    const { runtime, state } = createFakeRuntime();

    await runOperation(
      colorTokensUpsert,
      { runtime },
      {
        tokens: [
          {
            path: "A/One",
            light: "#000",
          },
        ],
      },
    );
    await runOperation(colorTokensDelete, { runtime }, { paths: ["A/One"] });

    const second = await runOperation(
      colorTokensUpsert,
      { runtime },
      {
        tokens: [
          {
            path: "A/Two",
            light: "#fff",
          },
        ],
      },
    );

    expect(second.dsl).toContain("+ColorStyleTokenNode token1 ");
    expect(second.diagnostics?.ok).toBe(true);
    expect(state.colorStyles.map((style) => style.path)).toEqual(["/A/Two"]);
  });
});
