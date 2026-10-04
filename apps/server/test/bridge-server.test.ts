import { mkdtemp, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { connect, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BRIDGE_INFO_PATH,
  BRIDGE_PATH,
  BRIDGE_PROTOCOL_VERSION,
  CloseCode,
  decodeServerToPlugin,
  WEB_SOCKET_PATH,
} from "@sitewright/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import { BridgeServer } from "../src/bridge/bridge-server.ts";
import { OwnerClient } from "../src/bridge/owner-client.ts";
import { BRIDGE_TOKEN_HEADER, PEER_PATH } from "../src/constants/bridge.ts";

const PLUGIN_ORIGIN = "https://localhost:5173";
const TOKEN = "t".repeat(43);

let server: BridgeServer | undefined;
let peer: OwnerClient | undefined;

afterEach(async () => {
  peer?.close();
  peer = undefined;
  await server?.close();
  server = undefined;
});

/** A bridge on an ephemeral port, serving a tiny built web app. */
async function start(): Promise<number> {
  const webRoot = await mkdtemp(join(tmpdir(), "sitewright-local-app-"));

  await writeFile(join(webRoot, "index.html"), "<!doctype html><title>journal</title>");
  server = new BridgeServer({
    port: 0,
    token: TOKEN,
    webRoot,
    pluginOrigins: [PLUGIN_ORIGIN],
  });

  const port = await server.listen();

  if (port === null) {
    throw new Error("An ephemeral port cannot be taken.");
  }

  return port;
}

/** Resolves with the open socket, or with the HTTP status of a rejected upgrade. */
function openAt(port: number, path: string, headers: Record<string, string>): Promise<WebSocket | number> {
  return new Promise((resolve) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}${path}`, { headers });

    socket.once("open", () => resolve(socket));
    socket.once("unexpected-response", (_request, response) => resolve(response.statusCode ?? 0));
  });
}

/** A raw HTTP request, so the Host header can be anything. */
function send(port: number, options: { path: string; method?: string; headers: Record<string, string> }) {
  return new Promise<{ status: number; headers: Record<string, unknown> }>((resolve, reject) => {
    const outgoing = request(
      {
        host: "127.0.0.1",
        port,
        ...options,
      },
      (response) => {
        response.resume();
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
          }),
        );
      },
    );

    outgoing.on("error", reject);
    outgoing.end();
  });
}

describe("BridgeServer", () => {
  it("lets only the local app's own pages open the plugin and panel sockets, and only peers with the token", async () => {
    const port = await start();
    const own = `http://127.0.0.1:${port}`;
    const host = `127.0.0.1:${port}`;

    expect(
      await openAt(port, BRIDGE_PATH, {
        origin: "https://evil.example",
        host,
      }),
    ).toBe(403);
    // The plugin reaches the server through the bridge window, never straight from its own origin.
    expect(
      await openAt(port, BRIDGE_PATH, {
        origin: PLUGIN_ORIGIN,
        host,
      }),
    ).toBe(403);
    expect(
      await openAt(port, BRIDGE_PATH, {
        origin: own,
        host: "evil.example",
      }),
    ).toBe(403);
    // No Origin: not a page.
    expect(await openAt(port, WEB_SOCKET_PATH, { host })).toBe(403);
    // A browser always sends an Origin, so a page cannot pass for a peer, even with the token.
    expect(
      await openAt(port, PEER_PATH, {
        origin: own,
        host,
        [BRIDGE_TOKEN_HEADER]: TOKEN,
      }),
    ).toBe(403);
    expect(
      await openAt(port, PEER_PATH, {
        host,
        [BRIDGE_TOKEN_HEADER]: "wrong",
      }),
    ).toBe(403);

    for (const socket of [
      await openAt(port, BRIDGE_PATH, {
        origin: own,
        host,
      }),
      await openAt(port, WEB_SOCKET_PATH, {
        origin: `http://localhost:${port}`,
        host: `localhost:${port}`,
      }),
    ]) {
      expect(socket).toBeInstanceOf(WebSocket);
      (socket as WebSocket).close();
    }
  });

  it("serves the web app under its own Host, says which plugins it relays for, and keeps the opener link", async () => {
    const port = await start();
    const host = `127.0.0.1:${port}`;
    const page = await send(port, {
      path: "/",
      headers: { host },
    });

    expect(page.status).toBe(200);
    expect(page.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    // The plugin talks to this window through window.opener, which this header would cut.
    expect(page.headers["cross-origin-opener-policy"]).toBeUndefined();
    expect(await (await fetch(`http://127.0.0.1:${port}${BRIDGE_INFO_PATH}`)).json()).toEqual({
      pluginOrigins: [PLUGIN_ORIGIN],
    });
    expect(
      (
        await send(port, {
          path: "/",
          headers: { host: "evil.example" },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await send(port, {
          path: "/",
          method: "POST",
          headers: { host },
        })
      ).status,
    ).toBe(405);
  });

  it("answers panel calls with the panel handler and pushes events to every panel", async () => {
    const port = await start();

    server?.servePanels(async (method) => ({ echoed: method }));

    const panel = (await openAt(port, WEB_SOCKET_PATH, {
      origin: `http://127.0.0.1:${port}`,
      host: `127.0.0.1:${port}`,
    })) as WebSocket;
    const messages: unknown[] = [];

    panel.on("message", (raw) => messages.push(JSON.parse(raw.toString())));
    panel.send(
      JSON.stringify({
        type: "call",
        id: "1",
        method: "activity.list",
        params: {},
      }),
    );
    await vi.waitFor(() => expect(messages).toHaveLength(1));
    server?.notify("activity.appended", { seq: 7 });
    await vi.waitFor(() => expect(messages).toHaveLength(2));

    expect(messages).toEqual([
      {
        type: "call_result",
        id: "1",
        ok: true,
        result: { echoed: "activity.list" },
      },
      {
        type: "event",
        name: "activity.appended",
        data: { seq: 7 },
      },
    ]);
    panel.close();
  });

  it("forwards an operation to the plugin and resolves with its response", async () => {
    const socket = await openSession(await start());

    socket.on("message", (raw) => {
      const message = decodeServerToPlugin(raw.toString());

      if (message?.type === "request") {
        socket.send(
          JSON.stringify({
            type: "response",
            id: message.id,
            ok: true,
            result: { echoed: message.op },
          }),
        );
      }
    });

    await expect(server?.request("colorTokens.list", {})).resolves.toEqual({ echoed: "colorTokens.list" });
    socket.close();
  });

  it("pushes events to the plugin, which no longer calls the server: a call from it is a bad message", async () => {
    const socket = await openSession(await start());
    const event = nextMessage(socket);

    server?.notify("editor.reveal", { id: "node-1" });
    expect(await event).toEqual({
      type: "event",
      name: "editor.reveal",
      data: { id: "node-1" },
    });

    const closed = new Promise<number>((resolve) => socket.once("close", (code) => resolve(code)));

    socket.send(
      JSON.stringify({
        type: "call",
        id: "c1",
        method: "activity.list",
        params: {},
      }),
    );
    expect(await closed).toBe(CloseCode.BadMessage);
  });

  it("regression: a panel handler that throws right away answers with an error instead of crashing the server", async () => {
    const port = await start();

    server?.servePanels(() => {
      throw new Error("Invalid params.");
    });

    const panel = (await openAt(port, WEB_SOCKET_PATH, {
      origin: `http://127.0.0.1:${port}`,
      host: `127.0.0.1:${port}`,
    })) as WebSocket;
    const answer = nextMessage(panel);

    panel.send(
      JSON.stringify({
        type: "call",
        id: "c2",
        method: "activity.undo",
        params: { entryId: 42 },
      }),
    );
    expect(await answer).toMatchObject({
      type: "call_result",
      id: "c2",
      ok: false,
      error: { message: "Invalid params." },
    });
    panel.close();
  });

  it("serves other Claude Code sessions: their operations and events reach the plugin, and they see it connect", async () => {
    const port = await start();

    peer = new OwnerClient({
      port,
      token: TOKEN,
      log: () => undefined,
    });

    expect(await peer.join(() => undefined)).toBe(true);
    expect(peer.plugin()).toBeNull();

    const plugin = await openSession(port);

    plugin.on("message", (raw) => {
      const message = decodeServerToPlugin(raw.toString());

      if (message?.type === "request") {
        plugin.send(
          JSON.stringify({
            type: "response",
            id: message.id,
            ok: true,
            result: { echoed: message.op },
          }),
        );
      }
    });
    await vi.waitFor(() =>
      expect(peer?.plugin()?.project).toEqual({
        id: "p",
        name: "Sandbox",
      }),
    );
    await expect(peer.request("colorTokens.list", {})).resolves.toEqual({ echoed: "colorTokens.list" });

    const event = nextMessage(plugin);

    peer.notify("editor.reveal", { id: "n1" });
    expect(await event).toEqual({
      type: "event",
      name: "editor.reveal",
      data: { id: "n1" },
    });
    plugin.close();
  });

  it("regression: malformed paths, upgrade targets and socket frames cannot crash the server", async () => {
    const port = await start();
    const host = `127.0.0.1:${port}`;

    // Not valid percent-encoding: an <img> on any page can send this.
    expect(
      (
        await send(port, {
          path: "/%E0%A4%A",
          headers: { host },
        })
      ).status,
    ).toBe(404);

    // An absolute-form upgrade target that `new URL` cannot parse.
    const upgrade = await new Promise<string>((resolve) => {
      const socket = connect(port, "127.0.0.1", () =>
        socket.write(
          [
            `GET http://[::1${WEB_SOCKET_PATH} HTTP/1.1`,
            `Host: ${host}`,
            "Upgrade: websocket",
            "Connection: Upgrade",
            "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==",
            "Sec-WebSocket-Version: 13",
            "",
            "",
          ].join("\r\n"),
        ),
      );
      let answer = "";

      socket.on("data", (chunk: Buffer) => {
        answer += chunk.toString();
      });
      socket.on("close", () => resolve(answer));
    });

    expect(upgrade).toMatch(/^HTTP\/1\.1 404/);

    // A text frame that is not UTF-8: ws reports it as an error on the panel socket.
    const closed = await new Promise<number>((resolve) => {
      const socket = new WebSocket(`ws://${host}${WEB_SOCKET_PATH}`, { headers: { origin: `http://${host}` } });

      socket.once("open", () => socket.send(Buffer.from([0xff, 0xfe, 0xfd]), { binary: false }));
      socket.once("close", (code) => resolve(code));
    });

    expect(closed).toBe(1007);
    expect(
      (
        await send(port, {
          path: "/",
          headers: { host },
        })
      ).status,
    ).toBe(200);
  });
});

/** Opens the plugin socket the way the bridge window does, and completes the hello handshake. */
async function openSession(port: number): Promise<WebSocket> {
  const socket = (await openAt(port, BRIDGE_PATH, {
    origin: `http://127.0.0.1:${port}`,
    host: `127.0.0.1:${port}`,
  })) as WebSocket;
  const acknowledged = nextMessage(socket);

  socket.send(
    JSON.stringify({
      type: "hello",
      protocol: BRIDGE_PROTOCOL_VERSION,
      plugin: {
        pluginVersion: "test",
        framerMode: "canvas",
        project: {
          id: "p",
          name: "Sandbox",
        },
      },
    }),
  );
  await acknowledged;

  return socket;
}

function nextMessage(socket: WebSocket): Promise<unknown> {
  return new Promise((resolve) => socket.once("message", (raw) => resolve(JSON.parse(raw.toString()))));
}

it("regression: a port holder that never answers fails the join instead of stalling the server's start", async () => {
  const silent = createServer(() => undefined);
  const port = await new Promise<number>((resolve) =>
    silent.listen(0, "127.0.0.1", () => {
      const address = silent.address();

      resolve(typeof address === "object" && address !== null ? address.port : 0);
    }),
  );

  peer = new OwnerClient({
    port,
    token: TOKEN,
    log: () => undefined,
  });

  try {
    expect(await peer.join(() => undefined)).toBe(false);
  } finally {
    silent.close();
  }
}, 10_000);
