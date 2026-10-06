import type { LogLevel } from "./logging.ts";
import type { TransportMode } from "./transports.ts";

export interface AppConfig {
  readonly logLevel: LogLevel;
  readonly cacheDir: string;
  readonly transport: TransportMode;
  readonly pluginBridge: boolean;
  readonly pluginOrigins: readonly string[];
  /** Where the activity journal lives, or null when it is off. */
  readonly historyDir: string | null;
  /** The log every sitewright process on this machine appends to (see `pnpm logs`). */
  readonly logFile: string;
  /** The switches of the journal page, shared by every session. */
  readonly settingsFile: string;
  /** Server API keys saved per project (see KeyStore). */
  readonly keysFile: string;
  /** When Claude last mentioned how to support the project (see SupportReminder). */
  readonly supportFile: string;
  /** SITEWRIGHT_SUPPORT_REMINDERS; the switch on the journal page can turn them off too. */
  readonly supportReminders: boolean;
  /** The skill inboxes of running sessions (see SkillInbox). */
  readonly skillNotesDir: string;
  /** The bridge's port and peer token, shared by every process (see loadOrCreateBridgeConfig). */
  readonly bridgeFile: string;
}

export interface ParsedConfig {
  readonly config: AppConfig;
  /** Problems to log once the logger exists. They name variables, never their values. */
  readonly warnings: readonly string[];
}
