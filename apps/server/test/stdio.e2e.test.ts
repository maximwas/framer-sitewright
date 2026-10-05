import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { describe, expect, it } from "vitest";

const entry = process.env.SITEWRIGHT_E2E_ENTRY ?? fileURLToPath(new URL("../src/bin.ts", import.meta.url));

describe("stdio server", () => {
  it("serves tools without Framer credentials and keeps stdout clean", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "sitewright-e2e-"));
    const inherited = Object.fromEntries(
      Object.entries(process.env).filter((pair): pair is [string, string] => pair[1] !== undefined),
    );
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [entry],
      env: {
        ...inherited,
        CLAUDE_PROJECT_DIR: projectDir,
        // Keys, journal and settings of this machine stay out: a saved project key would connect the Server API.
        SITEWRIGHT_HOME: projectDir,
        LOG_LEVEL: "info",
        SITEWRIGHT_PLUGIN_BRIDGE: "off",
      },
    });
    // A stray stdout line breaks JSON-RPC parsing, and the client reports it here instead of failing a call.
    const transportErrors: Error[] = [];

    transport.onerror = (error) => transportErrors.push(error);

    const client = new Client({
      name: "e2e",
      version: "0.0.0",
    });

    await client.connect(transport);

    try {
      const { tools } = await client.listTools();

      expect(tools).toHaveLength(47);

      const status = await client.callTool({
        name: "framer_status",
        arguments: {},
      });

      expect(status.structuredContent).toMatchObject({
        active: null,
        transports: [
          {
            transport: "server-api",
            configured: false,
          },
          {
            transport: "plugin",
            configured: false,
          },
        ],
      });
      expect(transportErrors).toEqual([]);
    } finally {
      await client.close();
    }
  }, 30_000);
});
