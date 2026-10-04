import type { AgentPort } from "@sitewright/core";
import type { CallTrace } from "../types/transports.ts";

/**
 * The same framer.agent, but every method call marks the trace of the call running now: a call counts as a Framer
 * agent call by what it did, not by what it asked for (via "auto" goes through the DSL without saying so). Wrapped
 * once per connection, so the runtime stays the same object and keeps its caches (DSL temp ids, font catalog).
 */
export function traceAgent(agent: AgentPort, current: () => CallTrace | undefined): AgentPort {
  return new Proxy(agent, {
    get(target, property, receiver) {
      const value: unknown = Reflect.get(target, property, receiver);

      if (typeof value !== "function") {
        return value;
      }

      return (...args: unknown[]) => {
        const trace = current();

        if (trace !== undefined) {
          trace.usedAgent = true;
        }

        return Reflect.apply(value, target, args);
      };
    },
  });
}
