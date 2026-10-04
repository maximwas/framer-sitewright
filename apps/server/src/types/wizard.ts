import type { KeyStore } from "../keys/key-store.ts";
import type { SettingsStore } from "../settings/settings-store.ts";
import type { Invocation } from "./cli.ts";

/** What the setup wizard needs: how to start this CLI, where its files are, and the key store. */
export interface WizardContext {
  /** How MCP clients start the server. */
  readonly server: Invocation;
  /** The shell command of the skill hook. */
  readonly hookCommand: string;
  readonly homeDir: string;
  readonly keys: KeyStore;
  /** The switches of what the agent may do. */
  readonly settings: SettingsStore;
  /** bridge.json, to find a running server and the plugin's project. */
  readonly bridgeFile: string;
}
