import { join } from "node:path";
import { DEFAULT_PLUGIN_ORIGINS } from "@sitewright/core";
import type * as z from "zod";
import { EnvSchema } from "../schemas/config.ts";
import type { ParsedConfig } from "../types/config.ts";

export function parseConfig(env: Record<string, string | undefined>, homeDir: string): ParsedConfig {
  const { parsed, warnings: envWarnings } = parseEnv(env);
  const { origins, warnings: originWarnings } = parsePluginOrigins(parsed.SITEWRIGHT_PLUGIN_ORIGINS);
  const warnings = [...envWarnings, ...originWarnings];
  const home = parsed.SITEWRIGHT_HOME ?? join(homeDir, ".sitewright");

  return {
    config: {
      logLevel: parsed.LOG_LEVEL,
      cacheDir: parsed.SITEWRIGHT_CACHE_DIR ?? join(homeDir, ".cache", "sitewright"),
      transport: parsed.SITEWRIGHT_TRANSPORT,
      pluginBridge: parsed.SITEWRIGHT_PLUGIN_BRIDGE === "on",
      pluginOrigins: origins,
      historyDir: parsed.SITEWRIGHT_HISTORY === "on" ? join(home, "history") : null,
      logFile: join(home, "logs", "sitewright.log"),
      settingsFile: join(home, "settings.json"),
      skillNotesDir: join(home, "skill-notes"),
      briefsDir: join(home, "briefs"),
      supportFile: join(home, "support.json"),
      keysFile: join(home, "keys.json"),
      supportReminders: parsed.SITEWRIGHT_SUPPORT_REMINDERS === "on",
      bridgeFile: join(home, "bridge.json"),
    },
    warnings,
  };
}

/**
 * Validates each variable on its own, so one typo (say LOG_LEVEL=verbose) falls back to that variable's default
 * with a warning instead of stopping the whole server, the Server API included.
 */
function parseEnv(env: Record<string, string | undefined>): { parsed: z.output<typeof EnvSchema>; warnings: string[] } {
  const warnings: string[] = [];
  const values = Object.fromEntries(
    Object.entries(EnvSchema.shape).map(([name, schema]) => {
      const result = schema.safeParse(env[name]);

      if (result.success) {
        return [name, result.data];
      }

      warnings.push(`${name} has an invalid value, so its default applies (see .env.example).`);

      return [name, schema.parse(undefined)];
    }),
  );

  return {
    parsed: EnvSchema.parse(values),
    warnings,
  };
}

/**
 * Plugin origins the bridge window relays for: the built-in ones plus SITEWRIGHT_PLUGIN_ORIGINS. "null" (the Origin of
 * sandboxed iframes on any site) and anything else that is not an http(s) origin is dropped with a warning.
 */
function parsePluginOrigins(list: string): { origins: string[]; warnings: string[] } {
  const origins = new Set(DEFAULT_PLUGIN_ORIGINS);
  const warnings: string[] = [];
  const entries = list
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");

  for (const [index, entry] of entries.entries()) {
    const origin = toHttpOrigin(entry);

    if (origin !== null) {
      origins.add(origin);
    } else {
      warnings.push(`SITEWRIGHT_PLUGIN_ORIGINS: ignoring entry ${index + 1}, which is not an http(s) origin.`);
    }
  }

  return {
    origins: [...origins],
    warnings,
  };
}

/** The origin a browser sends for a bare http(s) URL such as https://localhost:5173, or null. */
function toHttpOrigin(value: string): string | null {
  const url = URL.parse(value);

  if (url === null || (url.protocol !== "http:" && url.protocol !== "https:")) {
    return null;
  }

  const bare =
    url.pathname === "/" && url.search === "" && url.hash === "" && url.username === "" && url.password === "";

  return bare ? url.origin : null;
}
