import type { IncomingMessage, ServerResponse } from "node:http";
import { BRIDGE_INFO_PATH, type BridgeInfo, LOCAL_STATUS_PATH } from "@sitewright/core";
import type { LocalAppOptions } from "../types/web.ts";
import { pathOf, reply } from "./http.ts";
import { isOwnHost, securityHeaders } from "./security.ts";
import { readStatic } from "./static-files.ts";

/**
 * The local app's HTTP side: the built web app, and which plugin origins the bridge window relays for. Only GET, only
 * under the server's own Host. Never rejects: whatever breaks becomes a 500 for this request alone, because a throw
 * here would take the MCP server down.
 */
export async function serveLocalApp(
  request: IncomingMessage,
  response: ServerResponse,
  options: LocalAppOptions,
): Promise<void> {
  const headers = securityHeaders(options.port);

  try {
    if (!isOwnHost(request.headers.host, options.port)) {
      reply(response, 403, headers);

      return;
    }

    if (request.method !== "GET") {
      reply(response, 405, headers);

      return;
    }

    const pathname = pathOf(request.url);

    if (pathname === BRIDGE_INFO_PATH) {
      const info: BridgeInfo = { pluginOrigins: [...options.pluginOrigins] };

      response
        .writeHead(200, {
          ...headers,
          "Content-Type": "application/json",
        })
        .end(JSON.stringify(info));

      return;
    }

    if (pathname === LOCAL_STATUS_PATH) {
      response
        .writeHead(200, {
          ...headers,
          "Content-Type": "application/json",
        })
        .end(JSON.stringify(options.status()));

      return;
    }

    const file = options.root === null ? null : await readStatic(options.root, pathname);

    if (file === null) {
      reply(response, 404, headers);

      return;
    }

    response
      .writeHead(200, {
        ...headers,
        "Content-Type": file.contentType,
      })
      .end(file.body);
  } catch (error) {
    options.log("local app request failed", { error: String(error) });

    if (response.headersSent) {
      response.destroy();
    } else {
      reply(response, 500, headers);
    }
  }
}
