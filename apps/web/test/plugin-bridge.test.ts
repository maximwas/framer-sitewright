import type { AddressInfo } from "node:net";
import { BRIDGE_PROTOCOL_VERSION, decodePluginToServer, encode, relayMessage } from "@sitewright/core";
import { expect, it, onTestFinished, vi } from "vitest";
import { type WebSocket, WebSocketServer } from "ws";
import { PluginBridge } from "../src/bridge/plugin-bridge.ts";

const PLUGIN_ORIGIN = "https://plugin.example";
const PLUGIN_INFO = {
  pluginVersion: "test",
  framerMode: "canvas",
  project: {
    id: "project-1",
    name: "Sandbox",
  },
};

/** A plain ws server plays the MCP server; an EventTarget plays this window, a fake window the plugin that opened it. */
async function startBridge() {
  const server = new WebSocketServer({
    host: "127.0.0.1",
    port: 0,
  });

  await new Promise((resolve) => server.once("listening", resolve));

  const sockets: WebSocket[] = [];
  const received: unknown[] = [];

  server.on("connection", (socket) => {
    sockets.push(socket);
    socket.on("message", (raw) => received.push(decodePluginToServer(raw.toString())));
  });

  const events = new EventTarget();
  const toPlugin: unknown[] = [];
  const plugin = {
    closed: false,
    postMessage: (data: unknown, origin: string) => {
      expect(origin).toBe(PLUGIN_ORIGIN);
      toPlugin.push(data);
    },
  };
  const bridge = new PluginBridge({
    socketUrl: `ws://127.0.0.1:${(server.address() as AddressInfo).port}`,
    pluginOrigins: [PLUGIN_ORIGIN],
    events,
    opener: null,
  });
  const fromPlugin = (data: unknown, origin = PLUGIN_ORIGIN, source: unknown = plugin) =>
    events.dispatchEvent(
      Object.assign(new Event("message"), {
        data,
        origin,
        source,
      }),
    );

  onTestFinished(async () => {
    bridge.close();
    await new Promise((resolve) => server.close(resolve));
  });

  bridge.start();

  return {
    plugin,
    sockets,
    received,
    toPlugin,
    fromPlugin,
  };
}

/** The window's `run` messages to the plugin, in order. */
const runs = (toPlugin: unknown[]) =>
  toPlugin.filter((message): message is { kind: "run"; id: string; op: string } => {
    return typeof message === "object" && message !== null && "kind" in message && message.kind === "run";
  });

it("speaks the bridge protocol for the plugin: hello, then requests run in the plugin and come back as responses", async () => {
  const { sockets, received, toPlugin, fromPlugin } = await startBridge();

  fromPlugin(
    relayMessage({
      kind: "hello",
      plugin: PLUGIN_INFO,
    }),
  );
  await vi.waitFor(() => expect(received).toHaveLength(1));
  expect(received[0]).toEqual({
    type: "hello",
    protocol: BRIDGE_PROTOCOL_VERSION,
    plugin: PLUGIN_INFO,
  });

  const socket = sockets[0] as WebSocket;

  socket.send(
    encode({
      type: "hello_ack",
      protocol: BRIDGE_PROTOCOL_VERSION,
      sessionId: "session",
      server: {
        name: "test",
        version: "0",
      },
    }),
  );
  await vi.waitFor(() =>
    expect(toPlugin).toContainEqual(
      relayMessage({
        kind: "status",
        state: "connected",
        closeCode: null,
      }),
    ),
  );

  socket.send(
    encode({
      type: "request",
      id: "r1",
      op: "colorTokens.list",
      input: {},
      timeoutMs: 5000,
    }),
  );
  await vi.waitFor(() => expect(runs(toPlugin)).toHaveLength(1));

  const [run] = runs(toPlugin);

  expect(run).toMatchObject({
    op: "colorTokens.list",
    input: {},
    journal: false,
  });
  fromPlugin(
    relayMessage({
      kind: "result",
      id: run?.id ?? "",
      result: { tokens: [] },
    }),
  );
  await vi.waitFor(() =>
    expect(received).toContainEqual({
      type: "response",
      id: "r1",
      ok: true,
      result: { tokens: [] },
    }),
  );

  // A failure keeps the plugin's own error, so the server restores the same OperationError.
  socket.send(
    encode({
      type: "request",
      id: "r2",
      op: "nope",
      input: {},
      timeoutMs: 5000,
    }),
  );
  await vi.waitFor(() => expect(runs(toPlugin)).toHaveLength(2));
  fromPlugin(
    relayMessage({
      kind: "failure",
      id: runs(toPlugin)[1]?.id ?? "",
      error: {
        code: "UNKNOWN_OP",
        message: "Unknown operation: nope",
      },
    }),
  );
  await vi.waitFor(() =>
    expect(received).toContainEqual({
      type: "response",
      id: "r2",
      ok: false,
      error: {
        code: "UNKNOWN_OP",
        message: "Unknown operation: nope",
        data: null,
      },
    }),
  );
});

it("hears only an allowed plugin origin, and lets the server know when the plugin is gone", async () => {
  const { plugin, sockets, fromPlugin } = await startBridge();

  fromPlugin(
    relayMessage({
      kind: "hello",
      plugin: PLUGIN_INFO,
    }),
    "https://evil.example",
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(sockets).toHaveLength(0);

  fromPlugin(
    relayMessage({
      kind: "hello",
      plugin: PLUGIN_INFO,
    }),
  );
  await vi.waitFor(() => expect(sockets).toHaveLength(1));

  const closed = new Promise<void>((resolve) => sockets[0]?.once("close", () => resolve()));

  plugin.closed = true;
  await closed;
});
