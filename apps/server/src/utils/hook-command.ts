import { selfInvocation } from "./self-invocation.ts";

/** The shell command Claude Code runs as the skill hook: this CLI, started the way it was started, with `hook`. */
export function hookCommand(scriptPath: string, execPath: string): string {
  const { command, args } = selfInvocation(scriptPath, execPath);

  return command === "npx" ? `npx ${args.join(" ")} hook` : `"${command}" "${args[0] ?? ""}" hook`;
}
