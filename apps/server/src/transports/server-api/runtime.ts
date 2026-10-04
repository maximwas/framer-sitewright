import type { AgentPort, FramerPort, FramerRuntime } from "@sitewright/core";
import type { Framer } from "framer-api";

export function createServerApiRuntime(framer: Framer): FramerRuntime {
  // Compile-time conformance: if framer-api drifts from the structural ports, these lines stop compiling.
  const port: FramerPort = framer;
  const agent: AgentPort = framer.agent;

  return {
    transport: "server-api",
    port,
    agent,
    screenshot: (nodeId, options) => framer.screenshot(nodeId, options),
    // Framer keeps temp ids for the whole (possibly resumed) session, so salt them per connection.
    tempIdSalt: `_${Date.now().toString(36)}_`,
  };
}
