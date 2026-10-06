import * as z from "zod";
import { RELAY_SOURCE, RELAY_VERSION } from "../constants/bridge.ts";
import { PluginInfoSchema, WireErrorSchema } from "./bridge.ts";

const envelope = {
  source: z.literal(RELAY_SOURCE),
  v: z.literal(RELAY_VERSION),
};

/**
 * Journal window → plugin. The window speaks the bridge protocol with the server; the plugin only runs what it is
 * asked: `ready` (the page loaded), `status` (the window's connection to the server), `run` (an operation, journaled
 * or not), `event` (a server event such as editor.reveal).
 */
export const WindowToPluginSchema = z.discriminatedUnion("kind", [
  z.object({
    ...envelope,
    kind: z.literal("ready"),
  }),
  z.object({
    ...envelope,
    kind: z.literal("status"),
    state: z.enum(["connecting", "connected", "retrying", "stopped"]),
    closeCode: z.number().int().nullable(),
  }),
  z.object({
    ...envelope,
    kind: z.literal("run"),
    id: z.string().max(64),
    op: z.string().max(200),
    input: z.unknown(),
    journal: z.boolean(),
  }),
  z.object({
    ...envelope,
    kind: z.literal("event"),
    name: z.string().max(200),
    data: z.unknown(),
  }),
]);

/**
 * Plugin → journal window: `hello` (who the plugin is; the window then connects to the server on its behalf), the
 * outcome of a `run` (`result`, or `failure` with the bridge's wire error), `reconnect` (the user's button after the
 * bridge stopped for good).
 */
export const PluginToWindowSchema = z.discriminatedUnion("kind", [
  z.object({
    ...envelope,
    kind: z.literal("hello"),
    plugin: PluginInfoSchema,
    /** The editor tab is hidden: the browser then runs the plugin's timers about once a minute. */
    hidden: z.boolean().exactOptional(),
  }),
  z.object({
    ...envelope,
    kind: z.literal("result"),
    id: z.string().max(64),
    result: z.unknown(),
  }),
  z.object({
    ...envelope,
    kind: z.literal("failure"),
    id: z.string().max(64),
    error: WireErrorSchema,
  }),
  z.object({
    ...envelope,
    kind: z.literal("reconnect"),
  }),
]);

/** GET /api/bridge: the plugin origins the window works for. */
export const BridgeInfoSchema = z.object({ pluginOrigins: z.array(z.string()) });

/** GET /api/status: the project the plugin is open in, and its editor link when Framer gives it; null without a plugin. */
export const LocalStatusSchema = z.object({
  plugin: z
    .object({
      project: PluginInfoSchema.shape.project,
      editorUrl: z.string().nullable(),
    })
    .nullable(),
});
