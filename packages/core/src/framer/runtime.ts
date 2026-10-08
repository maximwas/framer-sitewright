import { KEY_SETUP_HINT } from "../constants/product.ts";
import { OperationError } from "../errors.ts";
import type { AgentPort, FramerRuntime, ScreenshotFn } from "../types/framer.ts";

/** What a call that needs framer.agent answers without it: in the plugin, or on a project without a Server API key. */
export function agentRequiredError(): OperationError {
  return new OperationError(
    "UNSUPPORTED_TRANSPORT",
    "This needs the project's Server API key: the plugin alone has no DSL, icon and component catalogs or screenshots.",
    KEY_SETUP_HINT,
  );
}

export function requireAgent(runtime: FramerRuntime): AgentPort {
  if (runtime.agent === null) {
    throw agentRequiredError();
  }

  return runtime.agent;
}

export function requireScreenshot(runtime: FramerRuntime): ScreenshotFn {
  if (runtime.screenshot === null) {
    throw new OperationError(
      "UNSUPPORTED_TRANSPORT",
      "Screenshots need the project's Server API key: the plugin alone cannot take them.",
      KEY_SETUP_HINT,
    );
  }

  return runtime.screenshot;
}
