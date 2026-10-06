import * as z from "zod";
import { REVERT_MAX_STEPS } from "../../constants/history.ts";
import { RevertRun } from "../../history/revert-run.ts";
import { colorStyleKind, linkStyleKind, textStyleKind, withStyleHistory } from "../../history/style-history.ts";
import { RevertResultSchema, UndoStepSchema } from "../../schemas/history.ts";
import { readLinkStyles } from "../../styles/link-styles.ts";
import { indexByPath } from "../../styles/style-index.ts";
import type { RevertResult, StyleStep, UndoStep } from "../../types/history.ts";
import { defineOperation } from "../define.ts";

/**
 * Undoes journal steps: restores what the AI changed, deletes what it created and recreates what it deleted.
 * Items someone changed after the AI are conflicts and stay as they are unless `onConflict` is "force". The revert
 * records its own changes, so redo is the undo of a revert.
 */
export const historyRevert = defineOperation({
  name: "history.revert",
  effect: "destructive",
  idempotent: false,
  permissions: [
    "createColorStyle",
    "ColorStyle.setAttributes",
    "ColorStyle.remove",
    "createTextStyle",
    "TextStyle.setAttributes",
    "TextStyle.remove",
    "Collection.addItems",
    "Collection.removeItems",
  ],
  // Node and link style steps are undone through the DSL; other styles through the Plugin API.
  needsAgent: ({ steps }) => steps.some((step) => step.kind === "node" || step.kind === "link-style"),
  input: z.strictObject({
    steps: z
      .array(UndoStepSchema)
      .min(1)
      .max(REVERT_MAX_STEPS)
      .describe("Undo steps from the activity journal, oldest first."),
    onConflict: z
      .enum(["skip", "force"])
      .default("skip")
      .describe("skip leaves items that changed after the AI; force overwrites them."),
    dryRun: z.boolean().default(false).describe("Only plan: report what would happen, change nothing."),
  }),
  output: z.object({
    dryRun: z.boolean(),
    results: z.array(RevertResultSchema),
    conflicts: z.number().int(),
  }),
  async run({ runtime, history }, { steps, onConflict, dryRun }) {
    const [colors, texts] = await Promise.all([runtime.port.getColorStyles(), runtime.port.getTextStyles()]);
    const revert = new RevertRun(
      runtime,
      {
        colors,
        texts,
      },
      {
        force: onConflict === "force",
        dryRun,
        history: dryRun ? undefined : history,
      },
    );

    if (dryRun) {
      return summarize(await revert.revertAll(steps), true);
    }

    const linkPaths = touchedPaths(steps, "link-style");
    // Link styles are read through framer.agent, which a revert without link style steps may not have.
    const [colorsByPath, textsByPath, linksByPath] = await Promise.all([
      indexByPath(Promise.resolve(colors)),
      indexByPath(Promise.resolve(texts)),
      linkPaths.length === 0 ? new Map() : indexByPath(readLinkStyles(runtime)),
    ]);
    const revertLinks = () =>
      linkPaths.length === 0
        ? revert.revertAll(steps)
        : withStyleHistory(
            {
              history,
              runtime,
              kind: linkStyleKind,
              before: linksByPath,
              paths: linkPaths,
            },
            () => revert.revertAll(steps),
          );
    const results = await withStyleHistory(
      {
        history,
        runtime,
        kind: colorStyleKind,
        before: colorsByPath,
        paths: touchedPaths(steps, "color-style"),
      },
      () =>
        withStyleHistory(
          {
            history,
            runtime,
            kind: textStyleKind,
            before: textsByPath,
            paths: touchedPaths(steps, "text-style"),
          },
          revertLinks,
        ),
    );

    return summarize(results, false);
  },
});

function touchedPaths(steps: readonly UndoStep[], kind: StyleStep["kind"]): string[] {
  return steps
    .filter((step): step is StyleStep => step.kind === kind)
    .flatMap((step) => [step.before?.path, step.after?.path])
    .filter((path) => path !== undefined);
}

function summarize(results: readonly RevertResult[], dryRun: boolean) {
  return {
    dryRun,
    results: [...results],
    conflicts: results.filter((result) => result.outcome === "conflict").length,
  };
}
