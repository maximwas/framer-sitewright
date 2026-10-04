import { PNG_SIGNATURE } from "../constants/testing.ts";
import type { FramerRuntime, ScreenshotFn } from "../types/framer.ts";
import type { FakeFramerState, FakeRuntimeOptions } from "../types/testing.ts";
import { createFakeAgent } from "./fake-agent.ts";
import { createFakePort } from "./fake-port.ts";
import { createIdSequence, defaultState } from "./fake-state.ts";

const fakeScreenshot: ScreenshotFn = async () => ({
  data: PNG_SIGNATURE,
  mimeType: "image/png",
});

/**
 * A runtime over an in-memory project: the Plugin API port and a framer.agent that applies DSL to the
 * same state. Styles passed in are copied, so tests can share fixtures.
 */
export function createFakeRuntime(
  overrides: Partial<FakeFramerState> = {},
  options: FakeRuntimeOptions = {},
): { runtime: FramerRuntime; state: FakeFramerState } {
  const state: FakeFramerState = {
    ...defaultState(),
    ...overrides,
  };

  state.colorStyles = state.colorStyles.map((style) => ({ ...style }));
  state.textStyles = state.textStyles.map((style) => ({ ...style }));

  const nextId = createIdSequence();
  // Like the real transports: the Server API has framer.agent and screenshots, the plugin has neither.
  const hasAgent = options.withAgent ?? true;
  const runtime: FramerRuntime = {
    transport: options.transport ?? "server-api",
    port: createFakePort(state, nextId),
    agent: hasAgent ? createFakeAgent(state, nextId) : null,
    screenshot: hasAgent ? fakeScreenshot : null,
  };

  return {
    runtime,
    state,
  };
}
