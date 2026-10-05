import { loadOrCreateBridgeConfig } from "../bridge/bridge-config.ts";
import { BridgeServer } from "../bridge/bridge-server.ts";
import { OwnerClient } from "../bridge/owner-client.ts";
import { KeyStore } from "../keys/key-store.ts";
import type { AppConfig } from "../types/config.ts";
import type { Logger } from "../types/logging.ts";
import type { PluginTransportOptions } from "../types/transports.ts";
import { findWebRoot } from "../web/static-files.ts";
import { PluginTransport } from "./plugin/transport.ts";
import { TransportRouter } from "./router.ts";
import { ServerApiPool } from "./server-api/pool.ts";
import { ServerApiSession } from "./server-api/session.ts";
import { ServerApiTransport } from "./server-api/transport.ts";

/**
 * Builds both transports and the router over them. The plugin bridge can fail in many ways (a broken
 * bridge.json, a taken port); none of them stops the server, and the Server API keeps working.
 */
export async function createTransports(config: AppConfig, logger: Logger, version: string): Promise<TransportRouter> {
  const serverApis = new ServerApiPool({
    fixed: null,
    keys: new KeyStore(config.keysFile),
    create: ({ url, key }) => serverApiTransport(url, key, logger),
  });
  const plugin = await createPluginTransport(
    config,
    {
      serverApiConfigured: () => serverApis.configured(),
      logger,
      localAppPort: null,
    },
    version,
  );

  serverApis.followPlugin(() => plugin.status().project);

  return new TransportRouter(serverApis, plugin, config.transport);
}

function serverApiTransport(projectUrl: string, apiKey: string, logger: Logger): ServerApiTransport {
  return new ServerApiTransport(
    new ServerApiSession({
      projectUrl,
      apiKey,
      logger,
    }),
  );
}

async function createPluginTransport(
  config: AppConfig,
  options: PluginTransportOptions,
  version: string,
): Promise<PluginTransport> {
  if (!config.pluginBridge) {
    return PluginTransport.disabled(options);
  }

  try {
    const { bridge, owner, port } = createBridge(config, options.logger, version);

    return await PluginTransport.connect(bridge, owner, {
      ...options,
      localAppPort: port,
    });
  } catch (error) {
    options.logger.error({ err: error }, "Plugin bridge setup failed; the Server API still works");

    return PluginTransport.failed(error, options);
  }
}

/** The bridge this process serves when it owns the port, and its way to the owner when another process does. */
function createBridge(
  config: AppConfig,
  logger: Logger,
  version: string,
): { bridge: BridgeServer; owner: OwnerClient; port: number } {
  const { port, token } = loadOrCreateBridgeConfig({ warn: (message) => logger.warn(message) });
  const log = (message: string, data?: Record<string, unknown>) => logger.debug(data ?? {}, `bridge: ${message}`);
  const bridge = new BridgeServer({
    port,
    token,
    webRoot: findWebRoot(),
    pluginOrigins: config.pluginOrigins,
    serverVersion: version,
    log,
  });

  bridge.on("connected", (session) => logger.info({ project: session.info.project?.name }, "Framer plugin connected"));
  bridge.on("disconnected", (_session, code) => logger.info({ code }, "Framer plugin disconnected"));
  bridge.on("rejected", (rejection) => logger.warn(rejection, "Plugin bridge refused a connection"));

  return {
    bridge,
    owner: new OwnerClient({
      port,
      token,
      log,
    }),
    port,
  };
}
