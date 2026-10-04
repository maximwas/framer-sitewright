import { EventMessageSchema, PluginInfoSchema, RequestMessageSchema, ResponseMessageSchema } from "@sitewright/core";
import * as z from "zod";

/** A process joining the bridge's owner says which peer protocol it speaks. */
const PeerHelloSchema = z.object({
  type: z.literal("peer_hello"),
  protocol: z.number().int(),
});

/** The owner tells its peers which plugin is connected: when they join, and on every change. */
const PluginStatusSchema = z.object({
  type: z.literal("plugin_status"),
  plugin: PluginInfoSchema.nullable(),
});

/** peer → owner: the hello, operations for the plugin (the plugin protocol's request) and events for its window. */
export const PeerToOwnerSchema = z.discriminatedUnion("type", [
  PeerHelloSchema,
  RequestMessageSchema,
  EventMessageSchema,
]);

/** owner → peer: the plugin's status, and answers to operations (the plugin protocol's response). */
export const OwnerToPeerSchema = z.discriminatedUnion("type", [PluginStatusSchema, ResponseMessageSchema]);
