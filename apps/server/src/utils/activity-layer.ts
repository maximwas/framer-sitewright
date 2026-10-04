import type { ActivityLayer, TransportKind } from "@sitewright/core";
import type { CallTrace } from "../types/transports.ts";

/** Which layer of Framer a call went through, for the journal's badge. */
export function layerOf(transport: TransportKind, trace: CallTrace): ActivityLayer {
  if (transport === "plugin") {
    return "plugin-api";
  }

  return trace.usedAgent ? "framer-agent" : "server-api";
}
