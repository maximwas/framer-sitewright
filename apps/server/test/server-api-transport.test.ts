import { colorTokensUpsert, designApply, projectOverview, requireAgent } from "@sitewright/core";
import { createFakeRuntime } from "@sitewright/core/testing";
import { ErrorCode, type Framer, FramerAPIError } from "framer-api";
import { describe, expect, it, vi } from "vitest";
import { createLogger } from "../src/logging/logger.ts";
import { ServerApiSession } from "../src/transports/server-api/session.ts";
import { ServerApiTransport } from "../src/transports/server-api/transport.ts";
import type { ConnectFn } from "../src/types/transports.ts";

const fakeFramer = () => ({ disconnect: vi.fn(async () => undefined) }) as unknown as Framer;

function session(connectFn: ConnectFn): ServerApiSession {
  return new ServerApiSession({
    projectUrl: "https://framer.com/projects/Site--abc",
    apiKey: "key",
    logger: createLogger("silent"),
    connectFn,
  });
}

describe("ServerApiTransport", () => {
  it("reuses one runtime per connection (keeps the font cache and the DSL temp-id sequence)", async () => {
    const { runtime } = createFakeRuntime();
    const createRuntime = vi.fn(() => runtime);
    const transport = new ServerApiTransport(
      session(async () => fakeFramer()),
      createRuntime,
    );

    await transport.run(projectOverview, {});
    await transport.run(projectOverview, {});
    expect(createRuntime).toHaveBeenCalledTimes(1);
  });

  it("traces whether a call used framer.agent: via auto writes through the DSL, via plugin-api does not", async () => {
    const { runtime } = createFakeRuntime();
    const transport = new ServerApiTransport(
      session(async () => fakeFramer()),
      () => runtime,
    );
    const viaAuto = { usedAgent: false };
    const viaPluginApi = { usedAgent: false };

    await transport.run(
      colorTokensUpsert,
      {
        tokens: [
          {
            path: "Brand/Blue",
            light: "#0099ff",
          },
        ],
      },
      { trace: viaAuto },
    );
    await transport.run(
      colorTokensUpsert,
      {
        tokens: [
          {
            path: "Brand/Red",
            light: "#ff0000",
          },
        ],
        via: "plugin-api",
      },
      { trace: viaPluginApi },
    );

    expect(viaAuto.usedAgent).toBe(true);
    expect(viaPluginApi.usedAgent).toBe(false);
  });

  it("regression: does not replay design.apply after a lost session", async () => {
    const { runtime } = createFakeRuntime();
    const applyChanges = vi.fn(async () => {
      throw new FramerAPIError("closed", ErrorCode.PROJECT_CLOSED);
    });
    const failing = {
      ...runtime,
      agent: {
        ...requireAgent(runtime),
        applyChanges,
      },
    };
    const connectFn = vi.fn(async () => fakeFramer());
    const transport = new ServerApiTransport(session(connectFn), () => failing);
    const applied = transport.run(designApply, { dsl: 'SET node width="1fr";' });

    await expect(applied).rejects.toMatchObject({
      code: "WRITE_FAILED",
      hint: expect.stringContaining("Re-read"),
    });
    expect(applyChanges).toHaveBeenCalledTimes(1);
    expect(connectFn).toHaveBeenCalledTimes(1);
    expect(transport.status().connected).toBe(false);
  });
});
