import {
  AGENT_ONLY_OPERATION_NAMES,
  agentRequiredError,
  BridgeError,
  type FramerRuntime,
  findPluginOperation,
  OperationError,
  runOperation,
  withJournal,
} from "@sitewright/core";
import type { PermissionCheck } from "../types/link.ts";

/**
 * Runs an operation of the plugin's registry by name on the plugin's runtime, once Framer allows the methods it calls.
 * With `journal`, it records what the operation changed and resolves with `{ output, journal }`: the server keeps the
 * journal. The operations that need framer.agent outright are not bundled here and answer as they do without a key.
 */
export async function runInPlugin(
  runtime: FramerRuntime,
  isAllowedTo: PermissionCheck,
  name: string,
  input: unknown,
  { journal }: { journal: boolean },
): Promise<unknown> {
  const operation = findPluginOperation(name);

  if (operation === undefined) {
    if (AGENT_ONLY_OPERATION_NAMES.includes(name)) {
      throw agentRequiredError();
    }

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
