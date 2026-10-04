import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { blankToUndefined } from "../utils/env.ts";

/**
 * Loads `<projectDir>/.env` into the variables that are unset or blank. Blank counts as unset because `.mcp.json`
 * passes `"${FRAMER_API_KEY:-}"` as an empty string when the shell has no such variable, and the file must then win.
 */
export function loadEnvFile(projectDir: string): void {
  const file = join(projectDir, ".env");

  if (!existsSync(file)) {
    return;
  }

  for (const [key, value] of Object.entries(parseEnv(readFileSync(file, "utf8")))) {
    if (blankToUndefined(process.env[key]) === undefined) {
      process.env[key] = value;
    }
  }
}
