import { errorMessage, OperationError } from "@sitewright/core";
import { connect, ErrorCode, FramerAPIError } from "framer-api";
import type { ConnectFn, ProjectRef } from "../types/transports.ts";

/**
 * Opens the project with the key once, to know the key works before it is saved: the project's hashed id (the one the
 * plugin reports) and its name. Throws in words a person can act on.
 */
export async function verifyKey(url: string, key: string, connectFn: ConnectFn = connect): Promise<ProjectRef> {
  let framer: Awaited<ReturnType<ConnectFn>>;

  try {
    framer = await connectFn(url, key);
  } catch (error) {
    throw new OperationError(
      "NOT_CONFIGURED",
      `This key does not open ${url}: ${errorMessage(error)}`,
      unauthorized(error)
        ? "Copy the key again from this project's Site Settings → General → API Keys: a key opens only its own project."
        : "Check the project link: copy it from the address bar while the project is open in Framer.",
    );
  }

  try {
    const { id, name } = await framer.getProjectInfo();

    return {
      id,
      name,
    };
  } finally {
    await framer.disconnect().catch(() => undefined);
  }
}

function unauthorized(error: unknown): boolean {
  return error instanceof FramerAPIError && error.code === ErrorCode.UNAUTHORIZED;
}
