import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { colorTokensDelete, colorTokensList, requireAgent, textStylesDelete, textStylesList } from "@sitewright/core";
import { createLogger } from "../../src/logging/logger.ts";
import { PluginTransport } from "../../src/transports/plugin/transport.ts";
import { TransportRouter } from "../../src/transports/router.ts";
import { ServerApiPool } from "../../src/transports/server-api/pool.ts";
import { ServerApiSession } from "../../src/transports/server-api/session.ts";
import { ServerApiTransport } from "../../src/transports/server-api/transport.ts";

export const TEST_PREFIX = "mcp-test";

/** The sandbox project the integration tests change freely. */
export interface Sandbox {
  readonly projectUrl: string;
  readonly apiKey: string;
}

/**
 * The sandbox from the repo's .env (FRAMER_API_KEY, FRAMER_PROJECT_URL), or null without one (the tests then skip).
 * Only these tests read .env: the server itself takes keys saved per project.
 */
export function integrationConfig(): Sandbox | null {
  const envFile = fileURLToPath(new URL("../../../../.env", import.meta.url));

  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }

  const apiKey = process.env.FRAMER_API_KEY?.trim();
  const projectUrl = process.env.FRAMER_PROJECT_URL?.trim();

  return apiKey && projectUrl
    ? {
        projectUrl,
        apiKey,
      }
    : null;
}

/** The production router pinned to the sandbox's Server API, without the plugin bridge (no port, no ~/.sitewright). */
export async function createIntegrationTransports({ projectUrl, apiKey }: Sandbox): Promise<TransportRouter> {
  const logger = createLogger("warn");
  const serverApi = new ServerApiTransport(
    new ServerApiSession({
      projectUrl,
      apiKey,
      logger,
    }),
  );

  return new TransportRouter(
    ServerApiPool.fixed(serverApi),
    PluginTransport.disabled({
      serverApiConfigured: () => true,
      logger,
      localAppPort: null,
    }),
    "server-api",
  );
}

export async function cleanupTestObjects(transports: TransportRouter): Promise<void> {
  const styles = await transports.run(textStylesList, { prefix: TEST_PREFIX });

  if (styles.styles.length > 0) {
    await transports.run(textStylesDelete, { paths: styles.styles.map((style) => style.path) });
  }

  const tokens = await transports.run(colorTokensList, { prefix: TEST_PREFIX });

  if (tokens.tokens.length > 0) {
    await transports.run(colorTokensDelete, { paths: tokens.tokens.map((token) => token.path) });
  }

  await deletePresetGhosts(transports);
}

interface SerializedPreset {
  readonly id?: unknown;
  readonly name?: unknown;
  readonly $originalId?: unknown;
  readonly attributes?: { readonly name?: unknown };
}

/** Text style presets as the DSL lists them: every style, and a node per breakpoint slot naming its style. */
function listPresets(transports: TransportRouter): Promise<SerializedPreset[]> {
  return transports.withServerApi(async (runtime) => {
    const nodes = await requireAgent(runtime).getNodesOfTypes({ types: ["TextStylePresetNode"] });

    return (Array.isArray(nodes) ? nodes : Object.values((nodes ?? {}) as object)) as SerializedPreset[];
  });
}

/**
 * Breakpoint slot nodes whose style no longer exists. They carry only the last segment of the style's path as their
 * name, so a name prefix does not find them; the style they name (`$originalId`) is gone.
 */
export async function orphanSlots(transports: TransportRouter): Promise<string[]> {
  const [presets, styles] = await Promise.all([listPresets(transports), transports.run(textStylesList, {})]);
  const live = new Set(styles.styles.map((style) => style.id));

  return presets.flatMap(({ id, $originalId }) =>
    typeof id === "string" && typeof $originalId === "string" && !live.has($originalId) ? [id] : [],
  );
}

/**
 * Text style presets as the DSL sees them. After Framer's remove() bug a preset can live on here while
 * getTextStyles() no longer lists it, so this is how the tests look for such ghosts.
 */
export async function presetsInDsl(
  transports: TransportRouter,
  prefix: string,
): Promise<{ id: string; name: string }[]> {
  return (await listPresets(transports)).flatMap(({ id, name, attributes }) => {
    const presetName = attributes?.name ?? name;

    return typeof id === "string" && typeof presetName === "string" && presetName.startsWith(prefix)
      ? [
          {
            id,
            name: presetName,
          },
        ]
      : [];
  });
}

async function deletePresetGhosts(transports: TransportRouter): Promise<void> {
  const ghosts = [
    ...(await presetsInDsl(transports, TEST_PREFIX)),
    ...(await orphanSlots(transports)).map((id) => ({ id })),
  ];

  if (ghosts.length === 0) {
    return;
  }

  await transports.withServerApi((runtime) =>
    requireAgent(runtime).applyChanges(ghosts.map((ghost) => `DEL ${ghost.id};`).join("\n")),
  );
}
