import { joinCommands } from "../dsl/commands.ts";
import { normalizeDslResult } from "../dsl/result.ts";
import { requireAgent } from "../framer/runtime.ts";
import type { FramerRuntime } from "../types/framer.ts";
import type { DslBatch, StyleWriteOutcome } from "../types/styles.ts";
import { unsentOutcome } from "./style-refs.ts";

/**
 * Sends a whole style batch in one applyChanges call, unless it is a dry run, and maps the temp ids of
 * created styles to the ids Framer assigned.
 */
export async function applyDslBatch(
  runtime: FramerRuntime,
  batch: DslBatch,
  dryRun: boolean,
): Promise<StyleWriteOutcome> {
  const dsl = joinCommands(batch.commands);

  if (dryRun || batch.commands.length === 0) {
    return unsentOutcome(batch.creates, dsl);
  }

  const diagnostics = normalizeDslResult(await requireAgent(runtime).applyChanges(dsl));
  const created = batch.creates.map(({ path, tempId }) => ({
    path,
    id: diagnostics.renamedIds[tempId] ?? null,
  }));

  return {
    created,
    dsl,
    diagnostics,
  };
}
