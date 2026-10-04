import { PRODUCT } from "@sitewright/core";
import type { Invocation } from "../types/cli.ts";

/**
 * How MCP clients and hooks should start this very CLI. Launched through npx, it sits in npx's cache, which npm may
 * clean: then through npx again, at the latest version. Installed anywhere else (globally, a clone of the repository),
 * those very files, with no network and no package lookup.
 */
export function selfInvocation(scriptPath: string, execPath: string): Invocation {
  return scriptPath.replaceAll("\\", "/").includes("/_npx/")
    ? {
        command: "npx",
        args: ["-y", `${PRODUCT.packageName}@latest`],
      }
    : {
        command: execPath,
        args: [scriptPath],
      };
}
