import * as z from "zod";
import { OPERATION_ERROR_CODES } from "../constants/errors.ts";
import { JournalSchema } from "./history.ts";

export const BridgeErrorCodeSchema = z.enum([
  "UNKNOWN_OP",
  "OP_FAILED",
  "TIMEOUT",
  "RESULT_NOT_SERIALIZABLE",
  "RESULT_TOO_LARGE",
  "PLUGIN_NOT_CONNECTED",
  "PLUGIN_DISCONNECTED",
]);

export const WireErrorSchema = z.object({
  code: BridgeErrorCodeSchema,
  message: z.string(),
  data: z.unknown().optional(),
});

export const PluginInfoSchema = z.object({
  pluginVersion: z.string(),
  framerMode: z.string(), // framer.mode, e.g. "canvas"
  project: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(), // framer.getProjectInfo()
  userAgent: z.string().optional(),
  /** The project's editor link (its main branch), when Framer gives it: a Server API key connects by it. */
  editorUrl: z.string().nullable().optional(),
});

// plugin -> server, first frame; server closes 4408 if it does not arrive in time
const HelloMessageSchema = z.object({
  type: z.literal("hello"),
  protocol: z.number().int(),
  plugin: PluginInfoSchema,
});

// server -> plugin
const HelloAckMessageSchema = z.object({
  type: z.literal("hello_ack"),
  protocol: z.number().int(),
  sessionId: z.string(),
  server: z.object({
    name: z.string(),
    version: z.string(),
  }),
});

// server -> plugin
export const RequestMessageSchema = z.object({
  type: z.literal("request"),
  id: z.string(),
  op: z.string(), // operation name from the core registry, e.g. "colorTokens.upsert"
  input: z.unknown().optional(), // validated by the operation's own zod schema on both sides
  timeoutMs: z.number().int().positive(), // relative: the plugin gives up this long after the request arrives
  // Record undo steps: the result becomes { output, journal }, and a failure carries the journal in error.data.
  journal: z.boolean().optional(),
});

/** The result of a request sent with `journal: true`. */
export const JournaledResultSchema = z.object({
  output: z.unknown(),
  journal: JournalSchema,
});

/** The `data` of a journaled request's error: the undo steps it recorded before it failed. */
export const JournaledErrorDataSchema = z.object({ journal: JournalSchema });

// plugin -> server
export const ResponseMessageSchema = z.discriminatedUnion("ok", [
  z.object({
    type: z.literal("response"),
    id: z.string(),
    ok: z.literal(true),
    result: z.unknown().optional(),
  }),
  z.object({
    type: z.literal("response"),
    id: z.string(),
    ok: z.literal(false),
    error: WireErrorSchema,
  }),
]);

// server -> plugin and journal panels, fire and forget: e.g. "editor.reveal" with a node id
export const EventMessageSchema = z.object({
  type: z.literal("event"),
  name: z.string(),
  data: z.unknown().optional(),
});

// journal panel -> server: the local app's page asks the server something (see ActivityCallSchema), answered by call_result
export const CallMessageSchema = z.object({
  type: z.literal("call"),
  id: z.string(),
  method: z.string(),
  params: z.unknown().optional(),
});

export const CallResultMessageSchema = z.discriminatedUnion("ok", [
  z.object({
    type: z.literal("call_result"),
    id: z.string(),
    ok: z.literal(true),
    result: z.unknown().optional(),
  }),
  z.object({
    type: z.literal("call_result"),
    id: z.string(),
    ok: z.literal(false),
    error: WireErrorSchema,
  }),
]);

export const PluginToServerSchema = z.discriminatedUnion("type", [HelloMessageSchema, ResponseMessageSchema]);

/** What the server sends the plugin, and, with call results, the journal panels (one decoder for both). */
export const ServerToPluginSchema = z.discriminatedUnion("type", [
  HelloAckMessageSchema,
  RequestMessageSchema,
  EventMessageSchema,
  CallResultMessageSchema,
]);

export const OperationErrorDataSchema = z.object({
  operationError: z.object({
    code: z.enum(OPERATION_ERROR_CODES),
    reason: z.string(),
    hint: z.string().nullable(),
  }),
});
