import { type PluginPermission, relayMessage } from "@sitewright/core";
import { createFakeRuntime } from "@sitewright/core/testing";
import { expect, it, onTestFinished, vi } from "vitest";
import { runInPlugin } from "../src/link/run-in-plugin.ts";
import { WindowLink } from "../src/link/window-link.ts";
import type { PermissionCheck } from "../src/types/link.ts";

const LOCAL = "http://127.0.0.1:18710";
const PLUGIN_INFO = {
  pluginVersion: "test",
  framerMode: "canvas",
  project: null,
};
const UPSERT_INPUT = {
  tokens: [
    {
      path: "Brand/Primary",
      light: "#0099ff",
    },
  ],
};

/** The plugin with its journal window: what the window posts arrives as `fromWindow`, what the plugin posts lands in `posted`. */
function linkedPlugin(isAllowedTo: PermissionCheck = () => true) {
  const events = new EventTarget();
  const posted: unknown[] = [];
  const journalWindow = {
    closed: false,
    focus: vi.fn(),
    postMessage: (data: unknown, origin: string) => {
      expect(origin).toBe(LOCAL);
      posted.push(data);
    },
  };
  const { runtime, state } = createFakeRuntime(
    {},
    {
      transport: "plugin",
      withAgent: false,
    },
  );
  const link = new WindowLink({
    handle: (op, input, options) => runInPlugin(runtime, isAllowedTo, op, input, options),
    pluginInfo: async () => PLUGIN_INFO,
    openWindow: () => journalWindow as unknown as Window,
    events,
  });
  const fromWindow = (data: unknown, origin = LOCAL, source: unknown = journalWindow) =>
    events.dispatchEvent(
      Object.assign(new Event("message"), {
        data,
        origin,
        source,
      }),
    );
  const run = async (op: string, input: unknown = {}, id = String(posted.length)) => {
    const before = posted.length;

    fromWindow(
      relayMessage({
        kind: "run",
        id,
        op,
        input,
        journal: false,
      }),
    );
    await vi.waitFor(() => expect(posted.length).toBeGreaterThan(before));

    return posted.findLast((message) => typeof message === "object" && message !== null && "id" in message);
  };

  onTestFinished(() => link.dispose());

  return {
    link,
    journalWindow,
    posted,
    state,
    fromWindow,
    run,
  };
}

it("opens the journal window, says hello until it answers, and shows the window's status", async () => {
  const { link, journalWindow, posted, fromWindow } = linkedPlugin();

  link.show();
  expect(link.status.getState()).toEqual({ state: "waiting" });
  await vi.waitFor(() =>
    expect(posted).toContainEqual(
      relayMessage({
        kind: "hello",
        plugin: PLUGIN_INFO,
        hidden: false,
      }),
    ),
  );

  fromWindow(
    relayMessage({
      kind: "status",
      state: "connected",
      closeCode: null,
    }),
  );
  expect(link.status.getState()).toEqual({ state: "connected" });

  // A second click brings the answered window forward instead of reloading it.
  link.show();
  expect(journalWindow.focus).toHaveBeenCalled();

  journalWindow.closed = true;
  await vi.waitFor(() => expect(link.status.getState()).toEqual({ state: "needs-window" }), { timeout: 3000 });
});

it("runs the operations the window asks for and answers with the result or the error", async () => {
  const { link, state, run } = linkedPlugin();

  link.show();
  expect(await run("colorTokens.upsert", UPSERT_INPUT)).toMatchObject({
    kind: "result",
    result: { via: "plugin-api" },
  });
  expect(state.colorStyles.map((style) => style.path)).toEqual(["/Brand/Primary"]);
  expect(await run("nope")).toMatchObject({
    kind: "failure",
    error: { code: "UNKNOWN_OP" },
  });
});

it("answers PERMISSION_DENIED and writes nothing when Framer does not allow the operation", async () => {
  const asked: PluginPermission[][] = [];
  const { link, state, run } = linkedPlugin((permissions) => {
    asked.push([...permissions]);

    return false;
  });

  link.show();
  expect(await run("colorTokens.upsert", UPSERT_INPUT)).toMatchObject({
    kind: "failure",
    error: { data: { operationError: { code: "PERMISSION_DENIED" } } },
  });
  expect(asked).toEqual([["createColorStyle", "ColorStyle.setAttributes"]]);
  expect(state.colorStyles).toEqual([]);
});

it("hears only its own window at its exact origin, and passes the server's events on", async () => {
  const { link, posted, fromWindow } = linkedPlugin();
  const events: unknown[] = [];

  link.onEvent((name, data) =>
    events.push({
      name,
      data,
    }),
  );
  link.show();

  const before = posted.length;
  const foreignRun = relayMessage({
    kind: "run",
    id: "x",
    op: "colorTokens.list",
    input: {},
    journal: false,
  });

  fromWindow(foreignRun, "https://evil.example");
  fromWindow(foreignRun, LOCAL, {});
  fromWindow(
    relayMessage({
      kind: "event",
      name: "editor.reveal",
      data: { id: "node-1" },
    }),
  );
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(posted.slice(before).filter((message) => (message as { kind: string }).kind !== "hello")).toEqual([]);
  expect(events).toEqual([
    {
      name: "editor.reveal",
      data: { id: "node-1" },
    },
  ]);
});
