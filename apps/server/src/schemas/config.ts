import * as z from "zod";
import { LOG_LEVELS } from "../constants/logging.ts";
import { blankToUndefined } from "../utils/env.ts";
import { TransportModeSchema } from "./transports.ts";

/**
 * The server's environment: process variables plus `<projectDir>/.env` (.env.example documents each one).
 * A blank value counts as unset. SITEWRIGHT_HOME and SITEWRIGHT_BRIDGE_PORT are read by
 * bridge/bridge-config.ts.
 */
export const EnvSchema = z.object({
  FRAMER_API_KEY: z
    .preprocess(blankToUndefined, z.string().optional())
    .describe("Server API key: project Site Settings → General → API Keys."),
  FRAMER_PROJECT_URL: z
    .preprocess(blankToUndefined, z.string().optional())
    .describe("The project the Server API opens."),
  LOG_LEVEL: z.preprocess(blankToUndefined, z.enum(LOG_LEVELS).default("info")).describe("Logs go to stderr."),
  SITEWRIGHT_TRANSPORT: z
    .preprocess(blankToUndefined, TransportModeSchema.default("auto"))
    .describe("auto: the plugin first while it is connected, the Server API for the DSL and otherwise."),
  SITEWRIGHT_PLUGIN_BRIDGE: z
    .preprocess(blankToUndefined, z.enum(["on", "off"]).default("on"))
    .describe("off: no WebSocket bridge for the Framer plugin."),
  SITEWRIGHT_PLUGIN_ORIGINS: z
    .preprocess(blankToUndefined, z.string().default(""))
    .describe("Comma-separated http(s) plugin origins the bridge window relays for, besides the built-in ones."),
  SITEWRIGHT_CACHE_DIR: z
    .preprocess(blankToUndefined, z.string().optional())
    .describe("Where the DSL reference is cached; default ~/.cache/sitewright."),
  SITEWRIGHT_HOME: z
    .preprocess(blankToUndefined, z.string().optional())
    .describe("Directory of bridge.json, the activity journal, settings.json and logs; default ~/.sitewright."),
  SITEWRIGHT_HISTORY: z
    .preprocess(blankToUndefined, z.enum(["on", "off"]).default("on"))
    .describe("off: no activity journal, so nothing can be undone."),
  SITEWRIGHT_SUPPORT_REMINDERS: z
    .preprocess(blankToUndefined, z.enum(["on", "off"]).default("on"))
    .describe("off: Claude never mentions how to support the project (otherwise at most once a week)."),
});
