import { WRITE_ACTION_PAST_TENSE } from "../constants/styles.ts";
import { OperationError } from "../errors.ts";
import type { PluginApiWrite } from "../types/styles.ts";
import { errorMessage } from "../utils/errors.ts";

/**
 * Runs Plugin API writes in order. The Plugin API has no transactions: when a write fails after others
 * succeeded, WRITE_FAILED names the applied ones, so the model re-reads instead of assuming nothing
 * changed. A failure before any write keeps its original error. `listTool` is named in the hints.
 */
export async function runPluginApiWrites(writes: readonly PluginApiWrite[], listTool: string): Promise<void> {
  const applied: string[] = [];

  for (const write of writes) {
    try {
      await runWrite(write, listTool);
    } catch (error) {
      if (applied.length === 0) {
        throw error;
      }

      throw writeFailed(write, applied, error, listTool);
    }

    applied.push(`${WRITE_ACTION_PAST_TENSE[write.action]} ${write.path}`);
  }
}

async function runWrite(write: PluginApiWrite, listTool: string): Promise<void> {
  if ((await write.run()) !== null) {
    return;
  }

  throw new OperationError(
    "NOT_FOUND",
    `Style "${write.path}" no longer exists in Framer.`,
    `It was deleted after it was read. Re-read with ${listTool}.`,
  );
}

function writeFailed(
  write: PluginApiWrite,
  applied: readonly string[],
  error: unknown,
  listTool: string,
): OperationError {
  return new OperationError(
    "WRITE_FAILED",
    `Could not ${write.action} "${write.path}": ${describeCause(error)} Already applied: ${applied.join(", ")}.`,
    `The Plugin API saves each style separately, so the applied changes stay. Re-read with ${listTool} before retrying.`,
    { cause: error },
  );
}

/** The cause as one sentence, so "Already applied" starts a new one. */
function describeCause(error: unknown): string {
  const text = error instanceof OperationError ? error.reason : errorMessage(error);

  return /[.!?]$/.test(text) ? text : `${text}.`;
}
