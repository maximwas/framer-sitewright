import type { SetupCommands } from "../types/setup.ts";

/** The commands that connect `packageName` to Claude Code and other MCP clients, run through npx. */
export function setupCommands(packageName: string): SetupCommands {
  const run = ["npx", "-y", `${packageName}@latest`];

  return {
    wizard: run.join(" "),
    addKey: `${run.join(" ")} key`,
    claudeCode: `claude mcp add ${packageName} -- ${run.join(" ")}`,
    claudeCodeWithKey: `claude mcp add ${packageName} -e FRAMER_API_KEY=<key> -e FRAMER_PROJECT_URL=<project url> -- ${run.join(" ")}`,
    skillHooks: `${run.join(" ")} setup --hooks --yes`,
    clientConfig: {
      mcpServers: {
        [packageName]: {
          command: run[0],
          args: run.slice(1),
        },
      },
    },
  };
}
