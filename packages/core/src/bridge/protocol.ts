// Bridge protocol between the MCP server and the Framer plugin. Runtime-agnostic (Node + browser).
import type * as z from "zod";
import { OperationError } from "../errors.ts";
import { JournaledError } from "../history/recorder.ts";
import {
  JournaledErrorDataSchema,
  OperationErrorDataSchema,
  PluginToServerSchema,
  ServerToPluginSchema,
} from "../schemas/bridge.ts";
import type { BridgeErrorCode, PluginToServer, ServerToPlugin, WireError } from "../types/bridge.ts";
import type { Journal } from "../types/history.ts";
import type { WebClientMessage } from "../types/web.ts";

export class BridgeError extends Error {
  readonly code: BridgeErrorCode;
  readonly data: unknown;

  constructor(code: BridgeErrorCode, message: string, data?: unknown) {
    super(message);
    this.name = "BridgeError";
    this.code = code;
    this.data = data;
  }
}

export function encode(message: PluginToServer | ServerToPlugin | WebClientMessage): string {
  return JSON.stringify(message);
}

function decodeWith<T>(schema: z.ZodType<T>, raw: string): T | null {
  let json: unknown;

  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }

  const parsed = schema.safeParse(json);

  return parsed.success ? parsed.data : null;
}

export const decodePluginToServer = (raw: string): PluginToServer | null => decodeWith(PluginToServerSchema, raw);
export const decodeServerToPlugin = (raw: string): ServerToPlugin | null => decodeWith(ServerToPluginSchema, raw);

/**
 * The error of a failed response. An OperationError keeps its code, reason and hint in `data`, and a JournaledError
 * adds the undo steps recorded before the failure as `data.journal`.
 */
export function toWireError(error: unknown): WireError {
  if (error instanceof JournaledError) {
    const wire = toWireError(error.cause);

    return {
      ...wire,
      data: {
        ...(typeof wire.data === "object" && wire.data !== null ? wire.data : {}),
        journal: error.journal,
      },
    };
  }

  if (error instanceof BridgeError) {
    return {
      code: error.code,
      message: error.message,
      data: error.data ?? null,
    };
  }

  if (error instanceof OperationError) {
    const operationError = {
      code: error.code,
      reason: error.reason,
      hint: error.hint ?? null,
    };

    return {
      code: "OP_FAILED",
      message: error.message,
      data: { operationError },
    };
  }

  return {
    code: "OP_FAILED",
    message: error instanceof Error ? error.message : String(error),
  };
}

/** Restores a response's error: the OperationError it carries, so both transports fail alike, or a BridgeError. */
export function fromWireError(wire: WireError): OperationError | BridgeError {
  const parsed = OperationErrorDataSchema.safeParse(wire.data);

  if (!parsed.success) {
    return new BridgeError(wire.code, wire.message, wire.data);
  }

  const { code, reason, hint } = parsed.data.operationError;

  return new OperationError(code, reason, hint ?? undefined);
}

/** The undo steps a failed journaled request recorded before it failed, if any. */
export function journalFromWireError(data: unknown): Journal | null {
  const parsed = JournaledErrorDataSchema.safeParse(data);

  return parsed.success ? parsed.data.journal : null;
}
