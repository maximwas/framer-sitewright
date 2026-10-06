import { describe, expect, it } from "vitest";
import { HistoryRecorder } from "../src/history/recorder.ts";
import { runOperation } from "../src/operations/define.ts";
import { historyRevert } from "../src/operations/history/revert.ts";
import { linkStylesDelete } from "../src/operations/link-styles/delete.ts";
import { linkStylesList } from "../src/operations/link-styles/list.ts";
import { linkStylesUpsert } from "../src/operations/link-styles/upsert.ts";
import { createFakeRuntime } from "../src/testing/index.ts";
import type { FakeLinkStyle } from "../src/types/testing.ts";

const MUTED = {
  id: "tok-muted",
  name: "Muted",
  path: "/Text/Muted",
  light: "rgb(155, 155, 161)",
  dark: null,
};
const PRIMARY = {
  id: "tok-primary",
  name: "Primary",
  path: "/Text/Primary",
  light: "rgb(255, 255, 255)",
  dark: null,
};
const NAV: FakeLinkStyle = {
  id: "link-nav",
  name: "Links/Nav",
  attributes: {
    "link.textColor": "var(--token-tok-muted)",
    "link.hover.textColor": "var(--token-tok-primary)",
    "link.transition": "tween 0.44,0,0.56,1 0.15s 0s",
  },
};

/** Link styles without ids, which a recreated style cannot keep, attributes in key order. */
function links(state: { linkStyles: readonly FakeLinkStyle[] }) {
  return state.linkStyles
    .map(({ name, attributes }) => ({
      name,
      attributes: Object.fromEntries(Object.entries(attributes).sort(([a], [b]) => a.localeCompare(b))),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

describe("link styles", () => {
  it("creates a style with token colors at rest, on hover and on the current page, and lists it", async () => {
    const { runtime, state } = createFakeRuntime({ colorStyles: [MUTED, PRIMARY] });
    const result = await runOperation(
      linkStylesUpsert,
      { runtime },
      {
        styles: [
          {
            path: " Links / Footer ",
            color: { token: "Text/Muted" },
            decoration: "none",
            hover: {
              color: { token: "Text/Primary" },
              decoration: "underline",
              decorationOffset: "3px",
            },
            current: { color: { value: "var(--token-tok-primary)" } },
          },
        ],
      },
    );

    expect(result.created).toEqual([
      {
        path: "Links/Footer",
        id: "link-1",
      },
    ]);
    expect(result.dsl).toBe(
      '+LinkStylePresetNode link0 name="Links/Footer" link.textColor="var(--token-tok-muted)" link.textDecoration="none" link.hover.textColor="var(--token-tok-primary)" link.hover.textDecoration="underline" link.hover.textDecorationOffset="3px" link.current.textColor="var(--token-tok-primary)";',
    );
    expect(state.linkStyles).toHaveLength(1);

    const { styles } = await runOperation(linkStylesList, { runtime }, {});

    expect(styles).toEqual([
      {
        id: "link-1",
        path: "Links/Footer",
        color: {
          token: "Text/Muted",
          value: "rgb(155, 155, 161)",
        },
        hover: {
          color: {
            token: "Text/Primary",
            value: "rgb(255, 255, 255)",
          },
          decoration: "underline",
          decorationOffset: "3px",
        },
        current: {
          color: {
            token: "Text/Primary",
            value: "rgb(255, 255, 255)",
          },
        },
        transition: null,
      },
    ]);
  });

  it("regression: writes only what differs, so the same input twice changes nothing though Framer drops `none` and spells padding out (seen 06.10.2026)", async () => {
    const { runtime, state } = createFakeRuntime({
      colorStyles: [MUTED, PRIMARY],
      linkStyles: [NAV],
    });
    const input = {
      styles: [
        {
          path: "Links/Nav",
          color: { token: "Text/Muted" },
          decoration: "none" as const,
          hover: {
            color: null,
            backgroundPadding: "2px 4px",
          },
          transition: null,
        },
      ],
    };
    const first = await runOperation(linkStylesUpsert, { runtime }, input);

    expect(first.updated).toEqual([
      {
        path: "Links/Nav",
        id: "link-nav",
      },
    ]);
    expect(first.dsl).toBe(
      'SET link-nav link.hover.textColor="null" link.hover.textBackgroundPadding="2px 4px" link.transition="null";',
    );
    expect(state.linkStyles[0]?.attributes).toEqual({
      "link.textColor": "var(--token-tok-muted)",
      "link.hover.textBackgroundPadding": "2px 4px 2px 4px",
    });

    const second = await runOperation(linkStylesUpsert, { runtime }, input);

    expect(second.unchanged).toEqual([
      {
        path: "Links/Nav",
        id: "link-nav",
      },
    ]);
    expect(second.dsl).toBe("");
  });

  it("refuses a new style without a color: Framer would draw its links in its default blue", async () => {
    const { runtime, state } = createFakeRuntime();

    await expect(
      runOperation(
        linkStylesUpsert,
        { runtime },
        {
          styles: [
            {
              path: "Links/Nav",
              decoration: "none",
            },
          ],
        },
      ),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(state.appliedDsl).toEqual([]);
  });

  it("deletes styles by path and folder; one that text still uses comes back in failed with Framer's reason", async () => {
    const used = {
      ...NAV,
      id: "link-used",
      name: "Links/Body",
    };
    const { runtime, state } = createFakeRuntime({
      linkStyles: [NAV, used],
      layers: {
        "page-home": [
          {
            type: "RichTextNode",
            id: "text-1",
            attributes: { linkStylePreset: "Links/Body" },
          },
        ],
      },
    });
    const result = await runOperation(
      linkStylesDelete,
      { runtime },
      {
        folders: ["Links"],
        paths: ["Links/Missing"],
      },
    );

    expect(result.deleted).toEqual([
      {
        path: "Links/Nav",
        id: "link-nav",
      },
    ]);
    expect(result.failed).toMatchObject([
      {
        path: "Links/Body",
        id: "link-used",
      },
    ]);
    expect(result.failed[0]?.reason).toContain("still use it");
    expect(result.notFound).toEqual(["Links/Missing"]);
    expect(state.linkStyles.map(({ id }) => id)).toEqual(["link-used"]);
  });

  it("undoes link style writes and deletes exactly, and redo reapplies them", async () => {
    const spare = {
      id: "link-spare",
      name: "Links/Spare",
      attributes: { "link.textColor": "rgb(1, 2, 3)" },
    };
    const { runtime, state } = createFakeRuntime({
      colorStyles: [MUTED, PRIMARY],
      linkStyles: [NAV, spare],
    });
    const original = links(state);
    const history = new HistoryRecorder();

    await runOperation(
      linkStylesUpsert,
      {
        runtime,
        history,
      },
      {
        styles: [
          {
            path: "Links/Nav",
            color: { token: "Text/Primary" },
            hover: { color: null },
            current: { decoration: "underline" },
          },
          {
            path: "Links/New",
            color: { value: "#ff0000" },
          },
        ],
      },
    );
    await runOperation(
      linkStylesDelete,
      {
        runtime,
        history,
      },
      { paths: ["Links/Spare"] },
    );

    expect(history.steps.map(({ kind }) => kind)).toEqual(["link-style", "link-style", "link-style"]);

    const afterAi = links(state);
    const redo = new HistoryRecorder();
    const undone = await runOperation(
      historyRevert,
      {
        runtime,
        history: redo,
      },
      { steps: [...history.steps] },
    );

    expect(links(state)).toEqual(original);
    expect(undone.results.find((result) => result.path === "Links/Spare")).toMatchObject({ outcome: "recreated" });

    await runOperation(historyRevert, { runtime }, { steps: [...redo.steps] });

    expect(links(state)).toEqual(afterAi);
  });
});
