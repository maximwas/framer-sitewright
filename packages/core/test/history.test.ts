import { describe, expect, it } from "vitest";
import { labelOf, restoreTargets, revertState, revertTitle, summarizeEntry } from "../src/history/activity.ts";
import { applyAliases } from "../src/history/aliases.ts";
import { categoriesOf } from "../src/history/change-categories.ts";
import { HistoryRecorder } from "../src/history/recorder.ts";
import { colorTokensDelete } from "../src/operations/color-tokens/delete.ts";
import { colorTokensUpsert } from "../src/operations/color-tokens/upsert.ts";
import { runOperation } from "../src/operations/define.ts";
import { historyRevert } from "../src/operations/history/revert.ts";
import { textStylesDelete } from "../src/operations/text-styles/delete.ts";
import { textStylesUpsert } from "../src/operations/text-styles/upsert.ts";
import { createFakeRuntime } from "../src/testing/index.ts";
import type { ActivityEntry, UndoStep } from "../src/types/history.ts";

const KEEP = {
  id: "tok-keep",
  name: "Keep",
  path: "/Brand/Keep",
  light: "rgb(0, 0, 0)",
  dark: null,
};
const OLD = {
  id: "tok-old",
  name: "Old",
  path: "/Brand/Old",
  light: "rgb(255, 0, 0)",
  dark: "rgb(0, 0, 255)",
};

/** Colour tokens without ids, which a recreated token cannot keep. */
function colors(state: { colorStyles: readonly { path: string; light: string; dark: string | null }[] }) {
  return state.colorStyles
    .map(({ path, light, dark }) => ({
      path,
      light,
      dark,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

describe("activity history", () => {
  it.each(["dsl", "plugin-api"] as const)(
    "undoes color token writes exactly, and redo reapplies them (via %s)",
    async (via) => {
      const { runtime, state } = createFakeRuntime({ colorStyles: [KEEP, OLD] });
      const original = colors(state);
      const history = new HistoryRecorder();

      await runOperation(
        colorTokensUpsert,
        {
          runtime,
          history,
        },
        {
          via,
          tokens: [
            {
              path: "Brand/New",
              light: "#00ff00",
            },
            {
              path: "Brand/Keep",
              light: "#ffffff",
              dark: "#111111",
            },
          ],
        },
      );
      await runOperation(
        colorTokensDelete,
        {
          runtime,
          history,
        },
        {
          via,
          paths: ["Brand/Old"],
        },
      );

      const afterAi = colors(state);
      const redo = new HistoryRecorder();
      const undone = await runOperation(
        historyRevert,
        {
          runtime,
          history: redo,
        },
        { steps: [...history.steps] },
      );

      expect(colors(state)).toEqual(original);
      expect(undone.results.find((result) => result.path === "Brand/Old")).toMatchObject({ outcome: "recreated" });

      await runOperation(historyRevert, { runtime }, { steps: [...redo.steps] });

      expect(colors(state)).toEqual(afterAi);
    },
  );

  it("leaves items changed after the AI alone unless forced", async () => {
    const { runtime, state } = createFakeRuntime();
    const history = new HistoryRecorder();

    await runOperation(
      colorTokensUpsert,
      {
        runtime,
        history,
      },
      {
        tokens: [
          {
            path: "Brand/New",
            light: "#000",
          },
        ],
      },
    );

    const [token] = await runtime.port.getColorStyles();

    await token?.setAttributes({ light: "#123456" });

    const skipped = await runOperation(historyRevert, { runtime }, { steps: [...history.steps] });

    expect(skipped).toMatchObject({
      conflicts: 1,
      results: [{ outcome: "conflict" }],
    });
    expect(state.colorStyles).toHaveLength(1);

    await runOperation(
      historyRevert,
      { runtime },
      {
        steps: [...history.steps],
        onConflict: "force",
      },
    );

    expect(state.colorStyles).toEqual([]);
  });

  it("restores a text style's font and breakpoints and re-binds it to a recreated token", async () => {
    const { runtime, state } = createFakeRuntime({ colorStyles: [OLD] }, { withAgent: false });
    const setup = {
      styles: [
        {
          path: "Body/Base",
          font: {
            family: "Inter",
            weight: 400,
          },
          fontSize: "16px",
          color: { token: "Brand/Old" },
          breakpoints: { medium: { fontSize: "15px" } },
        },
      ],
    } as const;

    await runOperation(textStylesUpsert, { runtime }, setup);

    const stylePath = state.textStyles[0]?.path;
    const history = new HistoryRecorder();

    await runOperation(
      textStylesUpsert,
      {
        runtime,
        history,
      },
      {
        styles: [
          {
            path: "Body/Base",
            font: {
              family: "Inter",
              weight: 700,
            },
            breakpoints: { medium: { fontSize: "14px" } },
          },
        ],
      },
    );
    await runOperation(
      textStylesDelete,
      {
        runtime,
        history,
      },
      { paths: ["Body/Base"] },
    );
    await runOperation(
      colorTokensDelete,
      {
        runtime,
        history,
      },
      { paths: ["Brand/Old"] },
    );
    await runOperation(historyRevert, { runtime }, { steps: [...history.steps] });

    const recreatedToken = state.colorStyles.find((token) => token.path === "/Brand/Old");

    expect(recreatedToken?.id).not.toBe(OLD.id);
    expect(state.textStyles[0]).toMatchObject({
      path: stylePath,
      fontSize: "16px",
      font: {
        family: "Inter",
        weight: 400,
      },
      minWidth: 0,
      breakpoints: [
        {
          minWidth: 1200,
          fontSize: "15px",
        },
      ],
      color: { id: recreatedToken?.id },
    });
  });

  it("records what a failing batch already applied", async () => {
    const { runtime } = createFakeRuntime({}, { withAgent: false });
    const createColorStyle = runtime.port.createColorStyle.bind(runtime.port);
    let calls = 0;

    runtime.port.createColorStyle = async (attributes) => {
      calls += 1;

      if (calls === 2) {
        throw new Error("Framer went away");
      }

      return createColorStyle(attributes);
    };

    const history = new HistoryRecorder();
    const write = runOperation(
      colorTokensUpsert,
      {
        runtime,
        history,
      },
      {
        tokens: [
          {
            path: "A/One",
            light: "#000",
          },
          {
            path: "A/Two",
            light: "#111",
          },
        ],
      },
    );

    await expect(write).rejects.toThrow(/WRITE_FAILED|Framer went away/);
    expect(history.steps).toMatchObject([
      {
        kind: "color-style",
        before: null,
        after: { path: "A/One" },
      },
    ]);
  });

  it("follows chains of recreated ids", () => {
    const step: UndoStep = {
      kind: "text-style",
      id: "style-a",
      before: null,
      after: null,
    };
    const aliases = new Map([
      ["style-a", "style-b"],
      ["style-b", "style-c"],
    ]);

    expect(applyAliases([step], aliases)[0]?.id).toBe("style-c");
  });
});

describe("activity journal: undo and redo chains", () => {
  const created: UndoStep = {
    kind: "color-style",
    id: "tok-1",
    before: null,
    after: {
      path: "Brand/Primary",
      light: "rgb(0, 0, 0)",
      dark: null,
    },
  };

  function entry(id: string, partial: Partial<ActivityEntry>): ActivityEntry {
    return {
      id,
      seq: 0,
      at: "2026-09-30T00:00:00.000Z",
      durationMs: 0,
      kind: "operation",
      actor: "user",
      tool: null,
      operation: null,
      effect: "destructive",
      transport: "server-api",
      layer: "server-api",
      project: null,
      title: id,
      outcome: "ok",
      error: null,
      steps: [created],
      incomplete: null,
      reverts: [],
      conflicts: 0,
      remap: {},
      label: null,
      detail: null,
      ...partial,
    };
  }

  /** Appends a revert of `targets`, titled the way the journal titles it. */
  function revert(
    entries: ActivityEntry[],
    id: string,
    kind: "undo" | "redo" | "restore",
    ...targets: ActivityEntry[]
  ): ActivityEntry {
    const [first] = targets;
    const next = entry(id, {
      kind,
      seq: entries.length + 1,
      title: kind === "restore" || first === undefined ? id : revertTitle(first, entries),
      reverts: targets.map((target) => target.id),
    });

    entries.push(next);

    return next;
  }

  it("acts on the newest link of an undo → redo → undo chain, and titles each link after the original change", () => {
    const change = entry("change", { title: "Design (DSL): 2 created" });
    const entries = [change];
    const undo = revert(entries, "undo", "undo", change);
    const redo = revert(entries, "redo", "redo", undo);
    const undoAgain = revert(entries, "undo-again", "undo", redo);
    const state = revertState(entries);
    const summaries = entries.map((candidate) => summarizeEntry(candidate, state));

    expect(entries.map((candidate) => candidate.title)).toEqual([
      "Design (DSL): 2 created",
      "Undo: Design (DSL): 2 created",
      "Redo: Design (DSL): 2 created",
      "Undo: Design (DSL): 2 created",
    ]);
    expect(summaries.map(({ id, undone, undoable, redoable }) => [id, undone, undoable, redoable])).toEqual([
      ["change", true, false, false],
      ["undo", false, false, false],
      ["redo", true, false, false],
      ["undo-again", false, false, true],
    ]);
    expect(revertTitle(undoAgain, entries)).toBe("Redo: Design (DSL): 2 created");
    expect(
      revertTitle(
        entry("restore", {
          kind: "restore",
          title: 'Restore to "Hero"',
        }),
        entries,
      ),
    ).toBe('Undo: Restore to "Hero"');
  });

  it("regression: a revert that changed nothing, failed or kept by conflicts, leaves its target undoable", () => {
    const change = entry("change", {});

    for (const nothing of [
      entry("failed", {
        kind: "undo",
        outcome: "failed",
        steps: [],
        reverts: ["change"],
      }),
      entry("kept", {
        kind: "undo",
        steps: [],
        conflicts: 1,
        reverts: ["change"],
      }),
    ]) {
      const state = revertState([change, nothing]);

      expect(summarizeEntry(change, state)).toMatchObject({
        undone: false,
        undoable: true,
      });
      expect(summarizeEntry(nothing, state).redoable).toBe(false);
    }
  });

  it("restores a checkpoint's state: later changes and undos of older ones are reverted, what cancelled out is not", () => {
    const older = entry("older", { seq: 1 });
    const checkpoint = entry("checkpoint", {
      seq: 2,
      kind: "checkpoint",
      steps: [],
    });
    const entries = [older, checkpoint];
    const undoOlder = revert(entries, "undo-older", "undo", older);
    const change = entry("change", { seq: entries.length + 1 });

    entries.push(change);
    revert(entries, "undo-change", "undo", change);

    expect(restoreTargets(entries, checkpoint.seq).map(({ id }) => id)).toEqual(["undo-older"]);

    revert(entries, "redo-older", "redo", undoOlder);

    expect(restoreTargets(entries, checkpoint.seq)).toEqual([]);

    // A restore to an earlier point that reverted changes from both sides of the checkpoint.
    const later = entry("later", { seq: entries.length + 1 });

    entries.push(later);
    revert(entries, "restore", "restore", older, later);

    expect(restoreTargets(entries, checkpoint.seq).map(({ id }) => id)).toEqual(["later", "restore"]);
  });

  it("undoes an entry with everything after it: later changes go too, an undo and its target cancel out", () => {
    const first = entry("first", { seq: 1 });
    const second = entry("second", { seq: 2 });
    const entries = [first, second];

    revert(entries, "undo-second", "undo", second);

    const third = entry("third", { seq: entries.length + 1 });

    entries.push(third);

    expect(restoreTargets(entries, first.seq - 1).map(({ id }) => id)).toEqual(["first", "third"]);
    expect(restoreTargets(entries, third.seq - 1).map(({ id }) => id)).toEqual(["third"]);
  });

  it("sorts changes into badge categories and names unnamed nodes by type and control text", () => {
    const state = (attributes: Record<string, string | null>) => ({
      parentId: "bp",
      index: 0,
      attributes,
      nodes: [],
      overrides: {},
    });
    const node = (change: "created" | "updated", type: string, attributes: Record<string, string | null>) =>
      ({
        kind: "node",
        id: `${type}-${change}`,
        type,
        name: null,
        pagePath: "/",
        change,
        before: change === "created" ? null : state({}),
        after: state(attributes),
      }) as const;
    const frame = node("created", "FrameNode", {
      fill: "rgb(0, 0, 255)",
      "appearEffect.enter.opacity": 0,
    } as unknown as Record<string, string>);
    const instance = node("created", "ComponentInstanceNode", {
      $control__variant: "Light",
      $control__label: "Get started",
    });
    const retext = node("updated", "RichTextNode", { textStylePreset: "Heading" });

    expect(categoriesOf([frame, instance, retext])).toEqual([
      {
        category: "components",
        count: 1,
      },
      {
        category: "animations",
        count: 1,
      },
      {
        category: "text",
        count: 1,
      },
      {
        category: "colors",
        count: 1,
      },
      {
        category: "layout",
        count: 1,
      },
    ]);
    expect(labelOf(instance)).toBe("Instance: Get started");
    expect(labelOf(frame)).toBe("Frame");
  });

  it("regression: a node set and moved in one batch is one item, not two with the same key", () => {
    const node = {
      kind: "node",
      id: "card",
      type: "FrameNode",
      name: "Card",
      pagePath: "/",
    } as const;
    const state = {
      parentId: null,
      index: null,
      attributes: {},
      nodes: [],
      overrides: {},
    };
    const both = entry("both", {
      steps: [
        {
          ...node,
          change: "updated",
          before: state,
          after: state,
        },
        {
          ...node,
          change: "moved",
          before: state,
          after: state,
        },
      ],
    });

    expect(summarizeEntry(both, revertState([both])).items).toEqual([
      {
        kind: "node",
        id: "card",
        path: "Card",
        change: "updated",
        swatch: null,
        categories: ["layout"],
      },
    ]);
  });
});
