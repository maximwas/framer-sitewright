import { OperationError } from "../errors.ts";
import type { AgentPort, FramerRuntime, ScreenshotFn } from "../types/framer.ts";

export function requireAgent(runtime: FramerRuntime): AgentPort {
  if (runtime.agent === null) {
    throw new OperationError(
      "UNSUPPORTED_TRANSPORT",
      `This operation needs framer.agent, which the ${runtime.transport} transport does not provide.`,
      "Use the Server API transport.",
    );
  }

  return runtime.agent;
}

export function requireScreenshot(runtime: FramerRuntime): ScreenshotFn {
  if (runtime.screenshot === null) {
    throw new OperationError(
      "UNSUPPORTED_TRANSPORT",
      `Screenshots are not available on the ${runtime.transport} transport.`,
      "Screenshots need the Server API transport.",
    );
  }

  return runtime.screenshot;
}
