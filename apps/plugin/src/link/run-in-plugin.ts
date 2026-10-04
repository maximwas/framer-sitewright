import {
  BridgeError,
  type FramerRuntime,
  findOperation,
  OperationError,
  runOperation,
  withJournal,
} from "@sitewright/core";
import type { PermissionCheck } from "../types/link.ts";

/**
 * Runs a registry operation by name on the plugin's runtime, once Framer allows the methods it calls. With `journal`,
 * it records what the operation changed and resolves with `{ output, journal }`: the server keeps the journal.
 */
export async function runInPlugin(
  runtime: FramerRuntime,
  isAllowedTo: PermissionCheck,
  name: string,
  input: unknown,
  { journal }: { journal: boolean },
): Promise<unknown> {
  const operation = findOperation(name);

  if (operation === undefined) {
    throw new BridgeError("UNKNOWN_OP", `Unknown operation: ${name}`);
  }

  // Asking first gives the model a clear error; Framer itself would fail the write and, in development, show a toast.
  if (operation.permissions.length > 0 && !isAllowedTo(operation.permissions)) {
    throw new OperationError(
      "PERMISSION_DENIED",
      `The Framer user who opened the plugin may not run ${operation.name}: it calls ${operation.permissions.join(", ")}.`,
      "Ask a project owner in Framer for edit access, then retry.",
    );
  }

  if (!journal) {
    return runOperation(operation, { runtime }, input);
  }

  return withJournal((history) =>
    runOperation(
      operation,
      {
        runtime,
        history,
      },
      input,
    ),
  );
}
