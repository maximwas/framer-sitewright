import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { type FramerRuntime, requireScreenshot } from "@sitewright/core";
import { createFakeRuntime } from "@sitewright/core/testing";
import type { Framer } from "framer-api";
import { afterEach, describe, expect, it } from "vitest";
import { CapabilityTracker } from "../src/capabilities/capability-tracker.ts";
import { parseConfig } from "../src/config/config.ts";
import { SERVER_INSTRUCTIONS } from "../src/constants/mcp.ts";
import { DocsCache } from "../src/docs/docs-cache.ts";
import { handleActivityCall } from "../src/history/activity-api.ts";
import { ActivityJournal } from "../src/history/activity-journal.ts";
import { ActivityUndo } from "../src/history/activity-undo.ts";
import { JournalStore } from "../src/history/journal-store.ts";
import { createLogger } from "../src/logging/logger.ts";
import { createMcpServer } from "../src/mcp/mcp-server.ts";
import { SettingsStore } from "../src/settings/settings-store.ts";
import { SupportReminder } from "../src/support/support-reminder.ts";
import { createTransports } from "../src/transports/create-transports.ts";
import { PluginTransport } from "../src/transports/plugin/transport.ts";
import { TransportRouter } from "../src/transports/router.ts";
import { ServerApiPool } from "../src/transports/server-api/pool.ts";
import { ServerApiSession } from "../src/transports/server-api/session.ts";
import { ServerApiTransport } from "../src/transports/server-api/transport.ts";

const EXPECTED_TOOLS = [
  "a11y_audit",
  "activity_checkpoint",
  "activity_get",
  "activity_list",
  "activity_open",
  "activity_redo",
  "activity_restore",
  "activity_undo",
  "breakpoints_add",
  "breakpoints_suggest",
  "cms_collection_create",
  "cms_collection_delete",
  "cms_collections_list",
  "cms_fields_set",
  "cms_items_delete",
  "cms_items_list",
  "cms_items_order",
  "cms_items_upsert",
  "code_file_check",
  "code_file_delete",
  "code_file_patch",
  "code_file_read",
  "code_file_rename",
  "code_file_write",
  "code_files_list",
  "code_files_read",
  "color_token_swap",
  "color_tokens_delete",
  "color_tokens_list",
  "color_tokens_upsert",
  "component_controls_set",
  "component_detach",
  "component_insert",
  "component_instances",
  "component_make_local",
  "components_export",
  "components_read",
  "contrast_check",
  "custom_code_get",
  "custom_code_set",
  "deployments_list",
  "design_apply",
  "design_guide",
  "effects_set",
  "file_upload",
  "fonts_discover",
  "fonts_search",
  "fonts_used",
  "framer_connect",
  "framer_docs",
  "framer_status",
  "framer_user",
  "icons_search",
  "image_upload",
  "images_check",
  "images_search",
  "layout_audit",
  "link_styles_delete",
  "link_styles_list",
  "link_styles_upsert",
  "links_check",
  "live_check",
  "locale_add",
  "locales_list",
  "localization_get",
  "localization_set",
  "marketplace_item",
  "node_clone",
  "node_export_css",
  "node_export_html",
  "node_screenshot",
  "node_show",
  "nodes_find",
  "nodes_query",
  "nodes_read",
  "nodes_select",
  "nodes_zoom",
  "page_create",
  "page_delete",
  "page_duplicate",
  "page_export_html",
  "page_export_react",
  "performance_audit",
  "plugin_data_get",
  "plugin_data_set",
  "project_overview",
  "project_publish",
  "publish_preview",
  "publish_status",
  "redirects_list",
  "redirects_set",
  "reference_screenshot",
  "rich_text_audit",
  "selection_get",
  "selection_wait",
  "seo_audit",
  "shaders_read",
  "site_audit",
  "site_settings_get",
  "site_settings_set",
  "styles_copy",
  "styles_usage",
  "svg_add",
  "template_audit",
  "text_replace",
  "text_styles_delete",
  "text_styles_list",
  "text_styles_upsert",
];

const logger = createLogger("silent");

/** The production composition without Framer credentials, the plugin bridge switched off. */
async function unconfiguredTransports(): Promise<TransportRouter> {
  const { config } = parseConfig({ SITEWRIGHT_PLUGIN_BRIDGE: "off" }, tmpdir());

  return createTransports(config, logger, "0.0.0-test");
}

/** The production transports around a fake project: only the Server API connection itself is fake. */
function fakeProjectTransports(runtime: FramerRuntime): TransportRouter {
  const framer = { disconnect: async () => undefined } as unknown as Framer;
  const session = new ServerApiSession({
    projectUrl: "https://framer.com/projects/Sandbox--abc",
    apiKey: "key",
    logger,
    connectFn: async () => framer,
  });
  const plugin = PluginTransport.disabled({
    serverApiConfigured: () => true,
    logger,
    localAppPort: null,
  });

  return new TransportRouter(ServerApiPool.fixed(new ServerApiTransport(session, () => runtime)), plugin, "auto");
}

let cleanup: (() => Promise<void>) | undefined;

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined;
});

async function connect(transports: TransportRouter) {
  const directory = await mkdtemp(join(tmpdir(), "sitewright-contract-"));
  const docs = new DocsCache({
    cacheDir: directory,
    apiVersion: "test",
  });
  const journal = new ActivityJournal({
    store: new JournalStore(join(directory, "history")),
    transports,
    logger,
  });
  const undo = new ActivityUndo(journal);
  const capabilities = new CapabilityTracker({ transports });
  const settings = new SettingsStore(join(directory, "settings.json"), logger);
  const server = createMcpServer(
    {
      transports,
      docs,
      journal,
      undo,
      capabilities,
      localApp: { url: () => transports.pluginUi.localAppUrl() },
      settings,
      // No support links in tests: the note never shows.
      support: new SupportReminder({
        file: join(directory, "support.json"),
        enabled: true,
        settings,
        links: [],
      }),
    },
    "0.0.0-test",
  );
  const client = new Client({
    name: "contract-test",
    version: "0.0.0",
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  cleanup = async () => {
    await client.close();
    await server.close();
    await transports.close();
  };

  return {
    client,
    journal,
    undo,
    settings,
  };
}

describe("tools/list", () => {
  it("exposes exactly the foundation tools with API-safe names, schemas and annotations", async () => {
    const { client } = await connect(await unconfiguredTransports());
    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name).sort()).toEqual(EXPECTED_TOOLS);

    for (const tool of tools) {
      expect(tool.name).toMatch(/^[a-z0-9_]+$/);
      expect(tool.inputSchema).not.toHaveProperty("anyOf");
      expect(tool.inputSchema).not.toHaveProperty("oneOf");
      expect(tool.description?.length ?? 0).toBeGreaterThan(20);
    }

    // Operation tools take their annotations from the operation's effect and idempotency.
    const annotations = Object.fromEntries(tools.map((tool) => [tool.name, tool.annotations]));

    expect(annotations.color_tokens_list).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    });
    expect(annotations.text_styles_upsert).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    });
    expect(annotations.design_apply).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    });
  });
});

describe("unconfigured server", () => {
  it("lists both transports and explains the setup instead of crashing", async () => {
    const { client } = await connect(await unconfiguredTransports());
    const status = await client.callTool({
      name: "framer_status",
      arguments: {},
    });

    expect(status.structuredContent).toMatchObject({
      mode: "auto",
      active: null,
      transports: [
        {
          transport: "server-api",
          configured: false,
          connected: false,
          project: null,
        },
        {
          transport: "plugin",
          configured: false,
          connected: false,
          project: null,
        },
      ],
      hint: expect.stringContaining("sitewright key"),
    });

    const tokens = await client.callTool({
      name: "color_tokens_list",
      arguments: {},
    });

    expect(tokens.isError).toBe(true);
    expect(JSON.stringify(tokens.content)).toContain("SITEWRIGHT_PLUGIN_BRIDGE=off");
    expect(JSON.stringify(tokens.content)).toContain("sitewright key");
  });
});

describe("configured server (fake project)", () => {
  it("returns Framer DSL errors as structured data, and names the project in framer_status", async () => {
    const { runtime, state } = createFakeRuntime();
    const { client } = await connect(fakeProjectTransports(runtime));

    state.nextApplyResult = {
      message: "Commands: 1 error.",
      errors: { "Invalid value": ["x"] },
    };

    const applied = await client.callTool({
      name: "design_apply",
      arguments: { dsl: 'SET x width="1fr";' },
    });

    expect(applied.isError).toBeFalsy();
    expect(applied.structuredContent).toMatchObject({
      ok: false,
      errors: [{ message: "Invalid value" }],
    });

    const status = await client.callTool({
      name: "framer_status",
      arguments: {},
    });

    expect(status.structuredContent).toMatchObject({
      active: "server-api",
      transports: [
        {
          transport: "server-api",
          connected: true,
          project: {
            id: "project-1",
            name: "Sandbox",
          },
        },
        {},
      ],
    });
  });

  it("journals writes, tells the AI what the user undid in the plugin, and redoes it", async () => {
    const { runtime, state } = createFakeRuntime();
    const { client, journal, undo } = await connect(fakeProjectTransports(runtime));
    const created = await client.callTool({
      name: "color_tokens_upsert",
      arguments: {
        tokens: [
          {
            path: "Brand/Primary",
            light: "#2563eb",
          },
        ],
      },
    });

    expect(created.structuredContent).toMatchObject({
      activity: {
        entry: { title: "Color tokens: 1 created" },
        userChanges: [],
      },
    });

    const listed = await client.callTool({
      name: "activity_list",
      arguments: {},
    });

    expect(listed.structuredContent).toMatchObject({
      project: { id: "project-1" },
      entries: [
        {
          title: "Color tokens: 1 created",
          actor: "ai",
          undoable: true,
        },
      ],
    });

    // The user presses Undo in the plugin window.
    const userUndo = {
      method: "activity.undo",
      params: {
        andLater: false,
        dryRun: false,
        onConflict: "skip",
      },
    } as const;

    await handleActivityCall(userUndo, journal, undo, "user");
    expect(state.colorStyles).toEqual([]);

    const read = await client.callTool({
      name: "color_tokens_list",
      arguments: {},
    });

    expect(read.structuredContent).toMatchObject({
      tokens: [],
      activity: { userChanges: [{ title: "Undo: Color tokens: 1 created" }] },
    });

    const redone = await client.callTool({
      name: "activity_redo",
      arguments: {},
    });

    expect(redone.isError).toBeFalsy();
    expect(redone.structuredContent).toMatchObject({ results: [{ outcome: "recreated" }] });
    expect(state.colorStyles.map((token) => token.path)).toEqual(["/Brand/Primary"]);
  });

  it("refuses code writes until the user switches them on in the journal page", async () => {
    const { runtime, state } = createFakeRuntime();
    const { client, settings } = await connect(fakeProjectTransports(runtime));
    const write = () =>
      client.callTool({
        name: "code_file_write",
        arguments: {
          name: "Ticker.tsx",
          code: "export default function Ticker() { return null }",
        },
      });
    const refused = await write();

    expect(refused.isError).toBe(true);
    expect(JSON.stringify(refused.content)).toContain("switched off in the Sitewright journal page");
    expect(state.codeFiles).toEqual([]);

    await settings.set({ codeComponents: true });

    expect((await write()).isError).toBeFalsy();
    expect(state.codeFiles.map(({ name }) => name)).toEqual(["Ticker.tsx"]);

    const deleted = await client.callTool({
      name: "code_file_delete",
      arguments: { name: "Ticker.tsx" },
    });

    expect(deleted.structuredContent).toMatchObject({ content: "export default function Ticker() { return null }" });
    expect(state.codeFiles).toEqual([]);
  });

  it("reports what the Framer plan allows and learns limits from refused calls", async () => {
    const { runtime } = createFakeRuntime({ branching: false });
    const { client } = await connect(fakeProjectTransports(runtime));
    const overview = await client.callTool({
      name: "project_overview",
      arguments: {},
    });

    expect(overview.structuredContent).toMatchObject({
      capabilities: {
        branches: "unavailable",
        limited: true,
        summary: expect.stringContaining("below Pro"),
      },
    });

    runtime.port.getColorStyles = async () => {
      throw new Error("The project plan does not include this feature.");
    };

    const refused = await client.callTool({
      name: "color_tokens_list",
      arguments: {},
    });

    expect(refused.isError).toBe(true);
    expect(JSON.stringify(refused.content)).toContain("Plan limit");

    const status = await client.callTool({
      name: "framer_status",
      arguments: {},
    });

    expect(status.structuredContent).toMatchObject({
      capabilities: {
        branches: "unavailable",
        limits: [{ tool: "color_tokens_list" }],
      },
    });
  });

  it("returns screenshots as image content", async () => {
    const { runtime } = createFakeRuntime();
    const { client } = await connect(fakeProjectTransports(runtime));
    const shot = await client.callTool({
      name: "node_screenshot",
      arguments: { nodeId: "bp1" },
    });

    expect(shot.isError).toBeFalsy();
    expect(shot.content).toMatchObject([
      {
        type: "image",
        mimeType: "image/png",
      },
      { type: "text" },
    ]);
  });
});

describe("what the client keeps", () => {
  // Claude Code keeps the first 2,048 characters of the instructions and of each tool description.
  it("regression: keeps the instructions and every tool description within 2,048 characters", async () => {
    const { client } = await connect(await unconfiguredTransports());
    const { tools } = await client.listTools();

    expect(SERVER_INSTRUCTIONS.length).toBeLessThanOrEqual(2048);
    expect(tools.filter((tool) => (tool.description ?? "").length > 2048).map((tool) => tool.name)).toEqual([]);
  });
});

describe("node_screenshot", () => {
  it("regression: captures a component through its primary variant, since Framer cannot export the component itself", async () => {
    const { runtime } = createFakeRuntime({
      canvas: [
        {
          id: "comp1",
          parentId: "page1",
          className: "SmartComponentNode",
          name: "Button",
        },
        {
          id: "var1",
          parentId: "comp1",
          className: "FrameNode",
          name: "Primary",
        },
        {
          id: "var2",
          parentId: "comp1",
          className: "FrameNode",
          name: "Hover",
        },
      ],
    });
    const captured: string[] = [];
    const withComponent: FramerRuntime = {
      ...runtime,
      screenshot: async (nodeId, options) => {
        if (nodeId === "comp1") {
          throw new Error(
            "Assertion Error: An exportable ground node must either support x,y position or be pinnable: comp1 SmartComponentNode",
          );
        }

        captured.push(nodeId);

        return requireScreenshot(runtime)(nodeId, options);
      },
    };

    const { client } = await connect(fakeProjectTransports(withComponent));
    const shot = await client.callTool({
      name: "node_screenshot",
      arguments: { nodeId: "comp1" },
    });

    expect(shot.isError).toBeFalsy();
    expect(captured).toEqual(["var1"]);
    expect(JSON.stringify(shot.content)).toContain("var1");
  });
});
