import { describe, expect, it } from "vitest";
import { HistoryRecorder } from "../src/history/recorder.ts";
import { runOperation } from "../src/operations/define.ts";
import { textStylesDelete } from "../src/operations/text-styles/delete.ts";
import { textStylesList } from "../src/operations/text-styles/list.ts";
import { siteBreakpointWidths } from "../src/operations/text-styles/site-breakpoints.ts";
import { pluginApiSlots, slotLabels, slotsOf } from "../src/operations/text-styles/slots.ts";
import { textStylesUpsert } from "../src/operations/text-styles/upsert.ts";
import { newTextStyle } from "../src/testing/fake-state.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

const BRAND_TEXT = {
  id: "tok-text",
  name: "Text",
  path: "/Brand/Text",
  light: "rgb(15, 23, 42)",
  dark: null,
};

describe("textStyles.upsert", () => {
  it("regression: keeps a style's name when an update repeats or changes its tag, which Framer renames on", async () => {
    const { runtime, state } = createFakeRuntime({
      textStyles: [newTextStyle("s1", "/Small"), newTextStyle("s2", "/Lead")],
    });

    await runOperation(
      textStylesUpsert,
      { runtime },
      {
        via: "plugin-api",
        styles: [
          {
            path: "Small",
            tag: "p",
            fontSize: "16px",
          },
          {
            path: "Lead",
            tag: "h3",
            fontSize: "20px",
          },
        ],
      },
    );

    expect(state.textStyles.map(({ path, tag }) => [path, tag])).toEqual([
      ["/Small", "p"],
      ["/Lead", "h3"],
    ]);
  });

  it("maps font, token color and breakpoint overrides to Framer DSL attributes", async () => {
    const { runtime, state } = createFakeRuntime({ colorStyles: [BRAND_TEXT] });
    const result = await runOperation(
      textStylesUpsert,
      { runtime },
      {
        styles: [
          {
            path: "Heading/H1",
            tag: "h1",
            font: {
              family: "inter",
              weight: 700,
            },
            fontSize: "48px",
            color: { token: "Brand/Text" },
            breakpoints: { medium: { fontSize: "36px" } },
          },
        ],
      },
    );
    const dsl = state.appliedDsl[0] ?? "";

    expect(dsl).toContain('+TextStylePresetNode style0 name="Heading/H1" tag="h1"');
    expect(dsl).toContain('fontName="Inter" fontWeight="700" fontStyle="normal"');
    expect(dsl).toContain('textColor="var(--token-tok-text)"');
    expect(dsl).toContain('breakpoint.medium.fontSize="36px"');
    expect(result.created).toEqual([
      {
        path: "Heading/H1",
        id: "text-1",
      },
    ]);
  });

  it("updates only provided attributes and treats path-only input as unchanged", async () => {
    const { runtime, state } = createFakeRuntime();

    await runOperation(
      textStylesUpsert,
      { runtime },
      {
        styles: [
          {
            path: "Body/Base",
            fontSize: "16px",
          },
        ],
      },
    );
    await runOperation(
      textStylesUpsert,
      { runtime },
      {
        styles: [
          {
            path: "Body/Base",
            fontSize: "18px",
          },
        ],
      },
    );

    const third = await runOperation(textStylesUpsert, { runtime }, { styles: [{ path: "Body/Base" }] });

    expect(state.appliedDsl[1]).toBe('SET text-1 fontSize="18px";');
    expect(third.unchanged).toEqual([
      {
        path: "Body/Base",
        id: "text-1",
      },
    ]);
  });

  it("regression: counts the breakpoints of every page, not only the home page's (seen: 1 page breakpoint where /lab had 3)", async () => {
    const { runtime, state } = createFakeRuntime(
      {},
      {
        withAgent: false,
        transport: "plugin",
      },
    );

    state.webPages.push({
      id: "lab",
      path: "/lab",
    } as never);
    state.canvas.push(
      {
        id: "lab-desktop",
        parentId: "lab",
        className: "FrameNode",
        name: "Desktop",
        isBreakpoint: true,
        width: "1440px",
      },
      {
        id: "lab-laptop",
        parentId: "lab",
        className: "FrameNode",
        name: "Laptop",
        isBreakpoint: true,
        width: "1280px",
      },
    );

    // The home page has 1200, 810 and 390: with /lab's 1440 and 1280 the site has five slot starts.
    expect(await siteBreakpointWidths(runtime.port)).toEqual([1440, 1280, 1200, 810, 390]);
  });

  it("writes through the Plugin API with font and token handles, slots where the site's breakpoints start", async () => {
    const { runtime, state } = createFakeRuntime(
      { colorStyles: [BRAND_TEXT] },
      {
        withAgent: false,
        transport: "plugin",
      },
    );
    const upsert = (breakpoints: Record<string, unknown>) =>
      runOperation(
        textStylesUpsert,
        { runtime },
        {
          styles: [
            {
              path: "Heading/H1",
              tag: "h1",
              font: {
                family: "Inter",
                weight: 700,
              },
              fontSize: "48px",
              color: { token: "Brand/Text" },
              alignment: "start",
              breakpoints,
            },
          ],
        },
      );

    // large makes four slots, and the fake site has three page breakpoints (1200, 810, 390) for them to start at.
    await expect(upsert({ large: { fontSize: "40px" } })).rejects.toThrow(/3 page breakpoints/);

    const result = await upsert({ medium: { fontSize: "36px" } });

    expect(result.via).toBe("plugin-api");
    // The Plugin API's form: the one slot is filed under the width where the base starts, and starts at 0 itself.
    expect(state.textStyles[0]).toMatchObject({
      tag: "h1",
      alignment: "left",
      font: {
        family: "Inter",
        weight: 700,
      },
      color: { id: "tok-text" },
      minWidth: 0,
      breakpoints: [
        {
          minWidth: 1200,
          fontSize: "36px",
        },
      ],
    });
    expect((await runOperation(textStylesList, { runtime }, {})).styles[0]).toMatchObject({
      minWidth: 1200,
      breakpoints: [
        {
          label: "medium",
          minWidth: 0,
          fontSize: "36px",
        },
      ],
    });
  });

  it("regression: files slots as Framer does, shifted by one with the narrowest at 0 (spikes 14 and 15)", () => {
    // Live Framer on a site of 1440/1280/810/390 (30.09.2026): one slot starts at 0; two at 1280 and 0; three at 1280,
    // 810 and 0. The Plugin API files each under the width where the next wider slot starts.
    const cases = [
      {
        sizes: ["30px"],
        filed: [1440],
        starts: [1440, 0],
      },
      {
        sizes: ["30px", "20px"],
        filed: [1440, 1280],
        starts: [1440, 1280, 0],
      },
      {
        sizes: ["30px", "20px", "10px"],
        filed: [1440, 1280, 810],
        starts: [1440, 1280, 810, 0],
      },
    ];

    for (const { sizes, filed, starts } of cases) {
      const slots = new Map(slotLabels(sizes.length).map((label, index) => [label, { fontSize: sizes[index] ?? "" }]));
      const written = pluginApiSlots("Probe", undefined, slots, [1440, 1280, 810, 390]);
      const style = newTextStyle("probe", "Probe");

      expect(written.minWidth).toBe(0);
      expect(written.breakpoints.map(({ minWidth }) => minWidth)).toEqual(filed);
      expect(
        slotsOf({
          ...style,
          minWidth: written.minWidth,
          breakpoints: written.breakpoints.map((breakpoint) => ({
            ...style,
            ...breakpoint,
          })),
        }).map(({ minWidth }) => minWidth),
      ).toEqual(starts);
    }
  });

  it("regression: updating one breakpoint keeps the others, with either writer", async () => {
    for (const via of ["dsl", "plugin-api"] as const) {
      const { runtime, state } = createFakeRuntime();
      const upsert = (breakpoints: Record<string, unknown>) =>
        runOperation(
          textStylesUpsert,
          { runtime },
          {
            via,
            styles: [
              {
                path: "Heading/H1",
                breakpoints,
              },
            ],
          },
        );

      await upsert({
        medium: { fontSize: "36px" },
        small: { fontSize: "28px" },
      });
      await upsert({ small: { fontSize: "26px" } });

      const [style] = (await runOperation(textStylesList, { runtime }, {})).styles;

      // Both writers leave the same slots, the DSL by its labels and the Plugin API in its shifted form.
      expect(state.textStyles).toMatchObject([
        {
          minWidth: 0,
          breakpoints: [{ minWidth: 1200 }, { minWidth: 810 }],
        },
      ]);
      expect(
        style?.breakpoints.map(({ label, minWidth, fontSize }) => ({
          label,
          minWidth,
          fontSize,
        })),
      ).toEqual([
        {
          label: "medium",
          minWidth: 810,
          fontSize: "36px",
        },
        {
          label: "small",
          minWidth: 0,
          fontSize: "26px",
        },
      ]);
    }
  });

  it("regression: takes a font uploaded to the project and reports a weight Framer swapped without an error", async () => {
    const { runtime, state } = createFakeRuntime();

    state.projectFonts = [400, 500].map((weight) => ({
      selector: `CUSTOM;Sofia Pro-${weight}`,
      family: "Sofia Pro",
      weight: weight as 400 | 500,
      style: "normal" as const,
    }));

    const result = await runOperation(
      textStylesUpsert,
      { runtime },
      {
        via: "dsl",
        styles: [
          {
            path: "Body/Small",
            font: {
              family: "Sofia Pro",
              weight: 300,
            },
          },
          {
            path: "Button",
            font: {
              family: "Sofia Pro",
              weight: 500,
            },
          },
        ],
      },
    );

    expect(result.created.map((style) => style.path)).toEqual(["Body/Small", "Button"]);
    expect(result.fontFallbacks).toEqual([
      {
        path: "Body/Small",
        requested: {
          family: "Sofia Pro",
          weight: 300,
          style: "normal",
        },
        stored: {
          family: "Sofia Pro",
          weight: 400,
          style: "normal",
        },
      },
    ]);
  });

  it("regression: a font change without weight or style keeps the current ones, with either writer", async () => {
    for (const via of ["dsl", "plugin-api"] as const) {
      const { runtime, state } = createFakeRuntime();
      const upsert = (font: Record<string, unknown>) =>
        runOperation(
          textStylesUpsert,
          { runtime },
          {
            via,
            styles: [
              {
                path: "Heading/H1",
                font,
              },
            ],
          },
        );

      await upsert({
        family: "Inter",
        weight: 700,
      });
      await upsert({ family: "inter" });
      expect(state.textStyles[0]?.font).toMatchObject({
        family: "Inter",
        weight: 700,
        style: "normal",
      });
    }
  });

  it("regression: plugin-api checks the whole batch before writing and names what a failed write applied", async () => {
    const { runtime, state } = createFakeRuntime(
      {},
      {
        withAgent: false,
        transport: "plugin",
      },
    );
    const invalid = [
      { path: "A/One" },
      {
        path: "A/Two",
        fontSize: "16px",
        breakpoints: { large: { fontSize: "14px" } },
      },
    ];

    await expect(runOperation(textStylesUpsert, { runtime }, { styles: invalid })).rejects.toThrow(
      /3 page breakpoints/,
    );
    expect(state.textStyles).toEqual([]);

    await runOperation(textStylesUpsert, { runtime }, { styles: [{ path: "A/One" }, { path: "A/Two" }] });

    const readThenLoseTwo = async () => {
      const styles = await runtime.port.getTextStyles();

      state.textStyles = state.textStyles.filter((style) => style.path !== "/A/Two");

      return styles;
    };
    const racing = {
      ...runtime,
      port: {
        ...runtime.port,
        getTextStyles: readThenLoseTwo,
      },
    };
    const update = {
      styles: [
        {
          path: "A/One",
          fontSize: "18px",
        },
        {
          path: "A/Two",
          fontSize: "18px",
        },
      ],
    };

    await expect(runOperation(textStylesUpsert, { runtime: racing }, update)).rejects.toMatchObject({
      code: "WRITE_FAILED",
      reason: expect.stringContaining("Already applied: updated A/One."),
    });
  });

  it("regression: a later breakpoint slot alone gets the earlier ones, which Framer adds in order", async () => {
    const { runtime, state } = createFakeRuntime();

    await runOperation(
      textStylesUpsert,
      { runtime },
      {
        styles: [
          {
            path: "Body",
            font: { family: "inter" },
            fontSize: "16px",
            breakpoints: { extraSmall: { fontSize: "15px" } },
          },
        ],
      },
    );

    expect(state.appliedDsl[0]).toContain(
      'breakpoint.medium.fontSize="16px" breakpoint.small.fontSize="16px" breakpoint.extraSmall.fontSize="15px"',
    );
  });

  it("regression: deletes every style at a path and whole folders, journaling each by id", async () => {
    const { runtime, state } = createFakeRuntime();

    await runOperation(
      textStylesUpsert,
      { runtime },
      { styles: ["Brand/Heading", "Brand/Sub/Caption", "Body", "Branding"].map((path) => ({ path })) },
    );

    const body = state.textStyles.find((style) => style.path === "/Body");

    if (body !== undefined) {
      state.textStyles.push({
        ...body,
        id: "text-twin",
      });
    }

    const history = new HistoryRecorder();
    const result = await runOperation(
      textStylesDelete,
      {
        runtime,
        history,
      },
      {
        paths: ["Body"],
        folders: ["Brand", "Missing"],
      },
    );

    expect(state.textStyles.map(({ path }) => path)).toEqual(["/Branding"]);
    expect(result.deleted.map(({ path }) => path).sort()).toEqual([
      "Body",
      "Body",
      "Brand/Heading",
      "Brand/Sub/Caption",
    ]);
    expect(result.notFound).toEqual(["Missing/"]);
    expect(history.steps).toHaveLength(4);
  });

  it("regression: a delete Framer refuses is reported as failed, not deleted", async () => {
    const { runtime } = createFakeRuntime();

    await runOperation(textStylesUpsert, { runtime }, { styles: [{ path: "Used" }] });

    const agent = runtime.agent;
    const refusing = {
      ...runtime,
      agent:
        agent === null
          ? null
          : {
              ...agent,
              applyChanges: async () => ({
                errors: { "Cannot remove node because RichTextNode nodes still use it.": [] },
              }),
            },
    };
    const result = await runOperation(textStylesDelete, { runtime: refusing }, { paths: ["Used"] });

    expect(result.deleted).toEqual([]);
    expect(result.failed).toEqual([
      expect.objectContaining({
        path: "Used",
        reason: expect.stringContaining("still use it"),
      }),
    ]);
  });

  it("rejects unknown tokens, ambiguous colors and bad units before calling Framer", async () => {
    const { runtime, state } = createFakeRuntime();
    const run = (style: Record<string, unknown>) => runOperation(textStylesUpsert, { runtime }, { styles: [style] });

    await expect(
      run({
        path: "A",
        color: { token: "Missing" },
      }),
    ).rejects.toThrow(/color_tokens_upsert/);
    await expect(
      run({
        path: "A",
        color: {
          token: "X",
          value: "#000",
        },
      }),
    ).rejects.toThrow(/exactly one/);
    await expect(
      run({
        path: "A",
        fontSize: "48",
      }),
    ).rejects.toThrow();
    expect(state.appliedDsl).toEqual([]);
  });
});
