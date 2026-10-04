import { describe, expect, it } from "vitest";
import { localAppOrigins, parsePluginMessage, parseWindowMessage, relayMessage } from "../src/bridge/relay.ts";

const plugin = {
  pluginVersion: "0.1.0",
  framerMode: "canvas",
  project: null,
};

describe("relay messages between the plugin and the journal window", () => {
  it("round-trips what the window sends the plugin, and only that", () => {
    const fromWindow = [
      relayMessage({ kind: "ready" }),
      relayMessage({
        kind: "status",
        state: "stopped",
        closeCode: 4409,
      }),
      relayMessage({
        kind: "run",
        id: "1",
        op: "colorTokens.list",
        input: {},
        journal: false,
      }),
      relayMessage({
        kind: "event",
        name: "editor.reveal",
        data: { id: "node-1" },
      }),
    ];

    for (const message of fromWindow) {
      expect(parseWindowMessage(message)).toEqual(message);
      expect(parsePluginMessage(message)).toBeNull();
    }
  });

  it("round-trips what the plugin sends the window, and only that", () => {
    const fromPlugin = [
      relayMessage({
        kind: "hello",
        plugin,
      }),
      relayMessage({
        kind: "result",
        id: "1",
        result: { tokens: [] },
      }),
      relayMessage({
        kind: "failure",
        id: "2",
        error: {
          code: "UNKNOWN_OP",
          message: "Unknown operation: nope",
        },
      }),
      relayMessage({ kind: "reconnect" }),
    ];

    for (const message of fromPlugin) {
      expect(parsePluginMessage(message)).toEqual(message);
      expect(parseWindowMessage(message)).toBeNull();
    }
  });

  it("ignores whatever else postMessage carries", () => {
    const ready = relayMessage({ kind: "ready" });

    expect(parseWindowMessage({ kind: "ready" })).toBeNull();
    expect(
      parseWindowMessage({
        ...ready,
        source: "other",
      }),
    ).toBeNull();
    expect(
      parseWindowMessage({
        ...ready,
        v: 1,
      }),
    ).toBeNull();
    expect(parsePluginMessage("hello")).toBeNull();
    expect(parsePluginMessage(null)).toBeNull();
  });

  it("names the local app's own origins", () => {
    expect(localAppOrigins(18710)).toEqual(["http://127.0.0.1:18710", "http://localhost:18710"]);
  });
});
