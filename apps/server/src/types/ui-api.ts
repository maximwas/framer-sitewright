import type { PluginInfo } from "@sitewright/core";
import type { CapabilityTracker } from "../capabilities/capability-tracker.ts";
import type { ActivityJournal } from "../history/activity-journal.ts";
import type { ActivityUndo } from "../history/activity-undo.ts";
import type { KeyStore } from "../keys/key-store.ts";
import type { SettingsStore } from "../settings/settings-store.ts";
import type { EditorLinks } from "../ui-api/editor-links.ts";
import type { OperationRunner, PluginUiChannel, ProjectRef } from "./transports.ts";

/** What a journal panel of the local app can reach on the server. */
export interface UiServices {
  readonly journal: ActivityJournal;
  readonly undo: ActivityUndo;
  readonly capabilities: CapabilityTracker;
  readonly editor: EditorLinks;
  readonly settings: SettingsStore;
  /** Server API keys saved per project. */
  readonly keys: KeyStore;
  /** The connected plugin: its project and editor link. */
  readonly pluginInfo: () => PluginInfo | null;
  /** Opens a project with a key before saving it; replaced in tests. */
  readonly verifyKey?: (url: string, key: string) => Promise<ProjectRef>;
  /** The project the plugin is open in, whose journal the panels show; without one, this session's project. */
  readonly shownProject?: () => ProjectRef | null;
}

export interface EditorLinksOptions {
  readonly transports: OperationRunner;
  readonly plugin: PluginUiChannel;
}
