import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createApp } from "./app.ts";
import { guardStdout } from "./logging/stdout-guard.ts";
import type { App } from "./types/app.ts";

/** Runs the MCP server on stdio until the client goes away or the process is told to stop. */
export async function startMcp(): Promise<void> {
  guardStdout();

  const app = await startApp();
  let closing = false;

  const shutdown = async (reason: string): Promise<void> => {
    if (closing) {
      return;
    }

    closing = true;
    app.logger.info({ reason }, "Shutting down");
    await app.close();
    process.exit(0);
  };

  process.stdin.on("end", () => void shutdown("stdin end"));
  process.stdin.on("close", () => void shutdown("stdin close"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

async function startApp(): Promise<App> {
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const started = await createApp(projectDir);

  await started.server.connect(new StdioServerTransport());

  const { mode, active } = started.transports.status();

  started.logger.info(
    {
      projectDir,
      mode,
      active,
    },
    "sitewright ready on stdio",
  );

  return started;
}
