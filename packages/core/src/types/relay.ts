import type * as z from "zod";
import type {
  BridgeInfoSchema,
  LocalStatusSchema,
  PluginToWindowSchema,
  WindowToPluginSchema,
} from "../schemas/relay.ts";

export type WindowToPlugin = z.infer<typeof WindowToPluginSchema>;

export type PluginToWindow = z.infer<typeof PluginToWindowSchema>;

export type RelayMessage = WindowToPlugin | PluginToWindow;

/** Drops the envelope from each member of a union of messages. */
type WithoutEnvelope<M> = M extends unknown ? Omit<M, "source" | "v"> : never;

/** A relay message before its envelope (source and version) is added. */
export type RelayPayload = WithoutEnvelope<RelayMessage>;

export type BridgeInfo = z.infer<typeof BridgeInfoSchema>;

export type LocalStatus = z.infer<typeof LocalStatusSchema>;
