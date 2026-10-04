import { RELAY_SOURCE, RELAY_VERSION } from "../constants/bridge.ts";
import { PluginToWindowSchema, WindowToPluginSchema } from "../schemas/relay.ts";
import type { PluginToWindow, RelayPayload, WindowToPlugin } from "../types/relay.ts";

/** A relay message with its envelope. */
export function relayMessage<P extends RelayPayload>(
  payload: P,
): P & { readonly source: typeof RELAY_SOURCE; readonly v: typeof RELAY_VERSION } {
  return {
    source: RELAY_SOURCE,
    v: RELAY_VERSION,
    ...payload,
  };
}

/** What the journal window sent the plugin, or null for anything else a window may receive. */
export function parseWindowMessage(data: unknown): WindowToPlugin | null {
  const parsed = WindowToPluginSchema.safeParse(data);

  return parsed.success ? parsed.data : null;
}

/** What the plugin sent the journal window, or null for anything else. */
export function parsePluginMessage(data: unknown): PluginToWindow | null {
  const parsed = PluginToWindowSchema.safeParse(data);

  return parsed.success ? parsed.data : null;
}

/** The origins of the local app on a port: the only ones its sockets and the plugin's journal window may come from. */
export function localAppOrigins(port: number): readonly string[] {
  return [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
}
