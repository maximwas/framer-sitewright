import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  a11yAudit,
  cmsCollectionCreate,
  cmsFieldsSet,
  codeFileWrite,
  colorTokensList,
  colorTokensUpsert,
  designApply,
  localizationGet,
  localizationSet,
  type Operation,
  runOperation,
  selectionGet,
  textStylesUpsert,
} from "@sitewright/core";
import { createFakeRuntime } from "@sitewright/core/testing";
import type { Framer } from "framer-api";
import { describe, expect, it, vi } from "vitest";
import type * as z from "zod";
import { CODE_COMPILE_MS } from "../src/constants/transports.ts";
import { KeyStore } from "../src/keys/key-store.ts";
import { createLogger } from "../src/logging/logger.ts";
import { TransportRouter } from "../src/transports/router.ts";
import { ServerApiPool } from "../src/transports/server-api/pool.ts";
import { ServerApiSession } from "../src/transports/server-api/session.ts";
import { ServerApiTransport } from "../src/transports/server-api/transport.ts";
import type { FramerTransport, PluginUiChannel } from "../src/types/transports.ts";

/** A connected plugin on `projectId` that runs operations on a plugin-like fake runtime and remembers them. */
function fakePlugin(projectId: string) {
  const ran: string[] = [];
  const { runtime } = createFakeRuntime(
    {},
    {
      withAgent: false,
      transport: "plugin",
    },
  );
  const plugin: FramerTransport & PluginUiChannel = {
    kind: "plugin",
    status: () => ({
      transport: "plugin",
      configured: true,
      connected: true,
      project: {
        id: projectId,
        name: "Sandbox",
      },
      hint: null,
    }),
    run: <I extends z.ZodObject, O extends z.ZodObject>(operation: Operation<I, O>, input: unknown) => {
      ran.push(operation.name);

      return runOperation(operation, { runtime }, input);
    },
    close: async () => undefined,
    servePanels: () => undefined,
    notify: () => undefined,
    localAppUrl: () => null,
    isConnected: () => true,
    pluginInfo: () => null,
  };

  return {
    plugin,
    ran,
  };
}

function serverApi() {
  const { runtime } = createFakeRuntime();
  const session = new ServerApiSession({
    projectUrl: "https://framer.com/projects/Sandbox--abc",
    apiKey: "key",
    logger: createLogger("silent"),
    connectFn: async () => ({ disconnect: async () => undefined }) as unknown as Framer,
  });

  return ServerApiPool.fixed(new ServerApiTransport(session, () => runtime));
}

/** The plugin bridge is on, but no plugin is connected (closed, or reloading). */
function absentPlugin() {
  const { plugin, ran } = fakePlugin("project-1");

  return {
    plugin: {
      ...plugin,
      status: () => ({
        ...plugin.status(),
        connected: false,
        project: null,
      }),
      isConnected: () => false,
    },
    ran,
  };
}

describe("TransportRouter auto", () => {
  it("runs nothing while the plugin is away: the project is always the one the plugin is open in", async () => {
    const { plugin, ran } = absentPlugin();
    const router = new TransportRouter(serverApi(), plugin, "auto");

    await expect(router.run(colorTokensList, {})).rejects.toThrow(/plugin is not connected/);
    await expect(router.run(designApply, { dsl: 'SET node name="x";' })).rejects.toThrow(/plugin is not connected/);
    expect(ran).toEqual([]);

    // Chosen on purpose, the Server API alone still works.
    router.setMode("server-api");
    await expect(router.run(colorTokensList, {})).resolves.toBeDefined();
  });

  it("regression: shows no active transport while the plugin is away, since nothing runs then", () => {
    // Seen: framer_status said active "server-api" while every call was refused for the missing plugin.
    const { plugin } = absentPlugin();
    const status = new TransportRouter(serverApi(), plugin, "auto").status();

    expect(status.active).toBeNull();
    expect(status.hint).toMatch(/Connect/);
  });

  it("puts the plugin first, and sends only what needs the DSL to the Server API", async () => {
    const { plugin, ran } = fakePlugin("project-1");
    const router = new TransportRouter(serverApi(), plugin, "auto");

    await router.run(colorTokensList, {});
    await router.run(designApply, { dsl: 'SET node name="x";' }).catch(() => undefined);

    expect(ran).toEqual(["colorTokens.list"]);
    expect(router.status().active).toBe("plugin");
  });

  it("regression: writes styles and tokens through the DSL when the project has a key, so design_apply finds them", async () => {
    // A text style the Plugin API created was refused by design_apply's textStylePreset until a DSL write touched it.
    const { plugin } = fakePlugin("project-1");
    const style = textStylesUpsert.input.parse({
      styles: [
        {
          path: "Lab/Heading",
          font: { family: "Inter" },
        },
      ],
    });
    const token = colorTokensUpsert.input.parse({
      tokens: [
        {
          path: "Ink",
          light: "#111111",
        },
      ],
    });
    const router = new TransportRouter(serverApi(), plugin, "auto");

    expect(router.routeOf(textStylesUpsert, style)).toBe("server-api");
    expect(router.routeOf(colorTokensUpsert, token)).toBe("server-api");
    expect(
      router.routeOf(textStylesUpsert, {
        ...style,
        via: "plugin-api",
      }),
    ).toBe("plugin");

    // A project without a key keeps them on the plugin, through the Plugin API.
    const { pool } = await poolWithKeys();

    pool.followPlugin(() => plugin.status().project);
    expect(new TransportRouter(pool, plugin, "auto").routeOf(textStylesUpsert, style)).toBe("plugin");
  });

  it("regression: reads and writes translations through the Server API: the plugin on the canvas may not", async () => {
    // Framer: "Method: getLocalizationGroups, is not allowed while in mode: canvas".
    const { plugin } = fakePlugin("project-1");
    const router = new TransportRouter(serverApi(), plugin, "auto");

    expect(router.routeOf(localizationGet, { locale: "uk" })).toBe("server-api");
    expect(
      router.routeOf(localizationSet, {
        locale: "uk",
        translations: [
          {
            id: "s1",
            value: "Привіт",
          },
        ],
      }),
    ).toBe("server-api");
  });

  it("regression: writes CMS collections and fields in the DSL's own session, so a list can bind them at once", async () => {
    // Seen: fields the plugin created stayed unknown to the DSL for minutes ("Expected an existing variable").
    const { plugin } = fakePlugin("project-1");
    const router = new TransportRouter(serverApi(), plugin, "auto");

    expect(router.routeOf(cmsCollectionCreate, { name: "Journal" })).toBe("server-api");
    expect(
      router.routeOf(cmsFieldsSet, {
        collection: "Journal",
        add: [
          {
            name: "Body",
            type: "formattedText",
          },
        ],
      }),
    ).toBe("server-api");
  });

  it("regression: runs the site checks through the Server API when the project has a key", () => {
    // Seen: a11y_audit ran through the plugin, whose read lacks the colors, and flagged 1.08:1 contrast that was fine.
    const { plugin } = fakePlugin("project-1");

    expect(new TransportRouter(serverApi(), plugin, "auto").routeOf(a11yAudit, {})).toBe("server-api");
  });

  it("regression: opens a fresh Server API session after code changes, once Framer has compiled them", async () => {
    const { plugin } = fakePlugin("project-1");
    let connections = 0;
    const session = new ServerApiSession({
      projectUrl: "https://framer.com/projects/Sandbox--abc",
      apiKey: "key",
      logger: createLogger("silent"),
      connectFn: async () => {
        connections += 1;

        return { disconnect: async () => undefined } as unknown as Framer;
      },
    });
    const { runtime } = createFakeRuntime();
    const router = new TransportRouter(
      ServerApiPool.fixed(new ServerApiTransport(session, () => runtime)),
      plugin,
      "auto",
    );

    vi.useFakeTimers({ toFake: ["setTimeout", "Date"] });

    try {
      await router.run(designApply, { dsl: 'SET node name="x";' }).catch(() => undefined);
      await router.run(codeFileWrite, {
        name: "Ticker.tsx",
        code: "export default function Ticker() { return null }",
      });

      // The next Server API call waits for Framer to compile the new code, then reads it through a new session.
      const next = router.run(designApply, { dsl: 'SET node name="y";' }).catch(() => undefined);

      await vi.advanceTimersByTimeAsync(CODE_COMPILE_MS - 1);
      expect(connections).toBe(1);
      await vi.advanceTimersByTimeAsync(1);
      await next;
      expect(connections).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("regression: gives nothing to a plugin open in another project, so two servers never mix projects", async () => {
    const { plugin, ran } = fakePlugin("another-project");
    const router = new TransportRouter(serverApi(), plugin, "auto");

    await router.run(colorTokensList, {});
    await router.run(designApply, { dsl: 'SET node name="x";' });

    expect(ran).toEqual([]);
    expect(router.status()).toMatchObject({
      active: "server-api",
      hint: expect.stringMatching(/calls go through the Server API/),
    });
  });
});

describe("TransportRouter selection", () => {
  it("asks the plugin for the editor selection even when the Server API leads", async () => {
    const { plugin, ran } = fakePlugin("project-1");
    const router = new TransportRouter(serverApi(), plugin, "server-api");

    await router.run(selectionGet, {});

    expect(ran).toEqual(["selection.get"]);
  });

  it("regression: refuses the selection of a plugin open in another project, unless the session works through the plugin", async () => {
    const elsewhere = fakePlugin("another-project");
    const viaServerApi = new TransportRouter(serverApi(), elsewhere.plugin, "server-api");

    await expect(viaServerApi.run(selectionGet, {})).rejects.toThrow(/wrong project/);
    expect(elsewhere.ran).toEqual([]);

    const viaPlugin = new TransportRouter(serverApi(), elsewhere.plugin, "plugin");

    await viaPlugin.withServerApi(async () => undefined);
    await viaPlugin.run(selectionGet, {});
    expect(elsewhere.ran).toEqual(["selection.get"]);
  });
});

/** A pool over a fresh keys.json whose Server APIs open fake projects; `opened` lists the links they connected to. */
async function poolWithKeys(fixed: ServerApiTransport | null = null) {
  const keys = new KeyStore(join(await mkdtemp(join(tmpdir(), "sitewright-keys-")), "keys.json"));
  const opened: string[] = [];
  const pool = new ServerApiPool({
    fixed,
    keys,
    create: ({ id, name, url }) => {
      opened.push(url);

      return new ServerApiTransport(
        new ServerApiSession({
          projectUrl: url,
          apiKey: "key",
          logger: createLogger("silent"),
          connectFn: async () => ({ disconnect: async () => undefined }) as unknown as Framer,
        }),
        () =>
          createFakeRuntime({
            project: {
              id,
              name,
            },
          }).runtime,
      );
    },
  });

  return {
    keys,
    pool,
    opened,
  };
}

describe("TransportRouter with keys saved per project", () => {
  it("uses the key of the project the plugin is open in, and keeps a project without one on the plugin", async () => {
    const { keys, pool, opened } = await poolWithKeys();

    await keys.set({
      id: "project-1",
      name: "Sandbox",
      url: "https://framer.com/projects/Sandbox--abc",
      key: "key",
    });

    const saved = fakePlugin("project-1");

    pool.followPlugin(() => saved.plugin.status().project);

    const router = new TransportRouter(pool, saved.plugin, "auto");

    await router.run(designApply, { dsl: 'SET node name="x";' });
    expect(opened).toEqual(["https://framer.com/projects/Sandbox--abc"]);
    expect(saved.ran).toEqual([]);

    // Another project, no key: the DSL call stays with the plugin, whose Plugin API path refuses raw DSL in words.
    const unsaved = fakePlugin("project-2");

    pool.followPlugin(() => unsaved.plugin.status().project);

    const withoutKey = new TransportRouter(pool, unsaved.plugin, "auto");

    await expect(withoutKey.run(designApply, { dsl: 'SET node name="x";' })).rejects.toThrow(/Server API key/);
    expect(unsaved.ran).toEqual(["design.apply"]);
  });

  it("regression: keeps the session's project when the plugin drops, instead of another fixed project", async () => {
    const environment = new ServerApiTransport(
      new ServerApiSession({
        projectUrl: "https://framer.com/projects/Sandbox--env",
        apiKey: "key",
        logger: createLogger("silent"),
        connectFn: async () => ({ disconnect: async () => undefined }) as unknown as Framer,
      }),
      () => createFakeRuntime().runtime,
    );
    const { keys, pool } = await poolWithKeys(environment);

    await keys.set({
      id: "project-1",
      name: "Client",
      url: "https://framer.com/projects/Client--abc",
      key: "key",
    });

    let plugin: { id: string; name: string } | null = {
      id: "project-1",
      name: "Client",
    };

    pool.followPlugin(() => plugin);

    const client = pool.current();

    expect(client).not.toBe(environment);

    // The plugin reloads: the session goes on with the client's project, not the sandbox in .env.
    plugin = null;
    expect(pool.current()).toBe(client);
  });

  it("switches to a project framer_connect names, until the plugin opens another one", async () => {
    const { keys, pool, opened } = await poolWithKeys();

    for (const [index, name] of ["Sandbox", "Vela", "Studio"].entries()) {
      await keys.set({
        id: `project-${index + 1}`,
        name,
        url: `https://framer.com/projects/${name}--abc`,
        key: "key",
      });
    }

    let pluginProject = "project-1";
    const plugin = fakePlugin("project-1");

    pool.followPlugin(() => ({
      id: pluginProject,
      name: "",
    }));

    const router = new TransportRouter(pool, plugin.plugin, "auto");

    await expect(router.useProject("Unknown")).rejects.toThrow(/Sandbox, Vela, Studio/);
    // Part of a name, as the user may say it: one project matches, or the agent hears which ones do.
    await expect(router.useProject("a")).rejects.toThrow(/fits 2 saved projects: Sandbox, Vela\./);
    await router.useProject("stud");
    expect(opened.at(-1)).toBe("https://framer.com/projects/Studio--abc");

    // By name, any case: the Server API opens Vela, and the plugin, open in Sandbox, gets nothing.
    await router.useProject("vela");
    await router.run(colorTokensList, {});
    expect(plugin.ran).toEqual([]);
    expect(opened.at(-1)).toBe("https://framer.com/projects/Vela--abc");
    expect(router.status()).toMatchObject({
      active: "server-api",
      transports: [{ project: { name: "Vela" } }, {}],
      projects: [
        {
          name: "Sandbox",
          chosen: false,
        },
        {
          name: "Vela",
          chosen: true,
        },
        {
          name: "Studio",
          chosen: false,
        },
      ],
    });

    // The person opens the plugin in another project: that is the newer choice, the plugin's project leads again.
    pluginProject = "project-3";
    expect(router.status()).toMatchObject({ transports: [{ project: { name: "Studio" } }, {}] });
    expect(router.status().projects.some((project) => project.chosen)).toBe(false);
  });
});
