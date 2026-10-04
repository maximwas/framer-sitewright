import {
  colorTokensDelete,
  colorTokensList,
  colorTokensUpsert,
  HistoryRecorder,
  historyRevert,
  requireAgent,
  textStylesDelete,
  textStylesList,
  textStylesUpsert,
} from "@sitewright/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TransportRouter } from "../../src/transports/router.ts";
import {
  cleanupTestObjects,
  createIntegrationTransports,
  integrationConfig,
  orphanSlots,
  presetsInDsl,
  TEST_PREFIX,
} from "./helpers.ts";

const config = integrationConfig();
const run = `${TEST_PREFIX}/${Date.now().toString(36)}`;

describe.skipIf(config === null)("styles on the sandbox project", () => {
  let transports: TransportRouter;

  beforeAll(async () => {
    if (config === null) {
      return;
    }

    transports = await createIntegrationTransports(config);
    await cleanupTestObjects(transports);
  });

  afterAll(async () => {
    await cleanupTestObjects(transports);
    await transports.close();
  });

  it("round-trips color tokens idempotently and removes a dark value", async () => {
    const input = {
      tokens: [
        {
          path: `${run}/Primary`,
          light: "#2563eb",
          dark: "#60a5fa",
        },
        {
          path: `${run}/Muted`,
          light: "#64748b",
        },
      ],
    };
    const created = await transports.run(colorTokensUpsert, input);

    expect(created.diagnostics?.ok).toBe(true);
    expect(created.created.every((token) => token.id !== null)).toBe(true);

    const again = await transports.run(colorTokensUpsert, input);

    expect(again.unchanged).toHaveLength(2);

    const updated = await transports.run(colorTokensUpsert, {
      tokens: [
        {
          path: `${run}/Muted`,
          light: "#475569",
        },
      ],
    });

    expect(updated.updated).toHaveLength(1);

    const withoutDark = {
      tokens: [
        {
          path: `${run}/Primary`,
          light: "#2563eb",
          dark: null,
        },
      ],
    };

    expect((await transports.run(colorTokensUpsert, withoutDark)).updated).toHaveLength(1);

    const listed = await transports.run(colorTokensList, { prefix: run });

    expect(listed.tokens.map((token) => token.path).sort()).toEqual([`${run}/Muted`, `${run}/Primary`]);
    expect(listed.tokens.find((token) => token.path === `${run}/Muted`)?.light).toBe("rgb(71, 85, 105)");
    expect(listed.tokens.find((token) => token.path === `${run}/Primary`)?.dark).toBeNull();

    const deleted = await transports.run(colorTokensDelete, { paths: [`${run}/Primary`, `${run}/Muted`] });

    expect(deleted.deleted).toHaveLength(2);
    expect((await transports.run(colorTokensList, { prefix: run })).tokens).toEqual([]);
  });

  it("creates a text style bound to a token and a real font", async () => {
    await transports.run(colorTokensUpsert, {
      tokens: [
        {
          path: `${run}/Text`,
          light: "#0f172a",
        },
      ],
    });

    const created = await transports.run(textStylesUpsert, {
      styles: [
        {
          path: `${run}/Heading`,
          tag: "h1",
          font: {
            family: "Inter",
            weight: 700,
          },
          fontSize: "48px",
          lineHeight: "1.1em",
          color: { token: `${run}/Text` },
          breakpoints: {
            medium: { fontSize: "40px" },
            small: { fontSize: "32px" },
          },
        },
      ],
    });

    expect(created.diagnostics?.ok).toBe(true);

    const listed = await transports.run(textStylesList, { prefix: run });

    expect(listed.styles[0]).toMatchObject({
      path: `${run}/Heading`,
      tag: "h1",
      font: {
        family: "Inter",
        weight: 700,
      },
      fontSize: "48px",
      lineHeight: "1.1em",
      color: { token: `${run}/Text` },
    });
    await transports.run(textStylesDelete, { paths: [`${run}/Heading`] });
    // Regression (01.10.2026): a DSL delete left the style's breakpoint slots behind as presets only the DSL sees.
    expect(await orphanSlots(transports)).toEqual([]);
  });

  // The same Plugin API code path the Framer plugin runs, exercised here through framer-api.
  it("manages tokens and text styles through Plugin API methods", async () => {
    const via = "plugin-api";
    const ink = `${run}/Api/Ink`;
    const created = await transports.run(colorTokensUpsert, {
      via,
      tokens: [
        {
          path: ink,
          light: "#111827",
          dark: "#f9fafb",
        },
      ],
    });

    expect(created).toMatchObject({
      via,
      created: [{ path: ink }],
    });

    const updated = await transports.run(colorTokensUpsert, {
      via,
      tokens: [
        {
          path: ink,
          light: "#1f2937",
          dark: null,
        },
      ],
    });

    expect(updated.updated).toHaveLength(1);

    const tokens = (await transports.run(colorTokensList, { prefix: `${run}/Api` })).tokens;

    expect(tokens.find((token) => token.path === ink)?.dark).toBeNull();

    const style = await transports.run(textStylesUpsert, {
      via,
      styles: [
        {
          path: `${run}/Api/Body`,
          font: {
            family: "Inter",
            weight: 700,
          },
          fontSize: "18px",
          lineHeight: "1.5em",
          color: { token: ink },
          breakpoints: {
            medium: { fontSize: "16px" },
            small: { fontSize: "14px" },
          },
        },
      ],
    });

    expect(style.via).toBe(via);

    const [listed] = (await transports.run(textStylesList, { prefix: `${run}/Api` })).styles;
    // Regression (spikes 14 and 15): the DSL sees the slots the Plugin API wrote where text_styles_list says they start.
    const slots = await transports.withServerApi(async (runtime) => {
      const preset = (await requireAgent(runtime).serialize({
        id: style.created[0]?.id ?? "",
        depth: 0,
      })) as { attributes?: { breakpoint?: Record<string, { minWidth: string; fontSize: string }> } } | null;

      return preset?.attributes?.breakpoint ?? {};
    });

    expect(listed).toMatchObject({
      font: {
        family: "Inter",
        weight: 700,
      },
      fontSize: "18px",
      lineHeight: "1.5em",
      color: {
        token: ink,
        value: "rgb(31, 41, 55)",
      },
    });
    expect(Object.keys(slots)).toEqual(["default", "medium", "small"]);
    expect(slots).toMatchObject({
      default: {
        minWidth: `${listed?.minWidth}px`,
        fontSize: "18px",
      },
      medium: {
        minWidth: `${listed?.breakpoints[0]?.minWidth}px`,
        fontSize: "16px",
      },
      small: {
        minWidth: "0px",
        fontSize: "14px",
      },
    });
    expect(listed?.breakpoints.map(({ label }) => label)).toEqual(["medium", "small"]);

    await transports.run(textStylesDelete, {
      via,
      paths: [`${run}/Api/Body`],
    });
    // Regression: remove() on a style with breakpoints used to leave a preset that only the DSL could see.
    expect(await presetsInDsl(transports, `${run}/Api`)).toEqual([]);
    await transports.run(colorTokensDelete, {
      via,
      paths: [ink],
    });
    expect((await transports.run(colorTokensList, { prefix: `${run}/Api` })).tokens).toEqual([]);
  });

  it("undoes token and text style changes exactly (activity journal)", async () => {
    const history = new HistoryRecorder();
    const ink = `${run}/Undo/Ink`;
    const body = `${run}/Undo/Body`;

    await transports.run(
      colorTokensUpsert,
      {
        tokens: [
          {
            path: ink,
            light: "#111827",
          },
        ],
      },
      { history },
    );
    await transports.run(
      textStylesUpsert,
      {
        styles: [
          {
            path: body,
            fontSize: "18px",
            color: { token: ink },
            breakpoints: { medium: { fontSize: "16px" } },
          },
        ],
      },
      { history },
    );
    await transports.run(
      colorTokensUpsert,
      {
        tokens: [
          {
            path: ink,
            light: "#ff0000",
          },
        ],
      },
      { history },
    );

    expect(history.steps).toHaveLength(3);

    const undone = await transports.run(historyRevert, { steps: [...history.steps] });

    expect(undone.conflicts).toBe(0);
    expect((await transports.run(colorTokensList, { prefix: `${run}/Undo` })).tokens).toEqual([]);
    expect((await transports.run(textStylesList, { prefix: `${run}/Undo` })).styles).toEqual([]);
    expect(await presetsInDsl(transports, `${run}/Undo`)).toEqual([]);
  });
});
