import { homedir } from "node:os";
import { SUPPORT_LINKS } from "@sitewright/core";
import framerApiPackage from "framer-api/package.json" with { type: "json" };
import serverPackage from "../package.json" with { type: "json" };
import { BriefStore } from "./brief/brief-store.ts";
import { CapabilityTracker } from "./capabilities/capability-tracker.ts";
import { parseConfig } from "./config/config.ts";
import { DocsCache } from "./docs/docs-cache.ts";
import { ActivityJournal } from "./history/activity-journal.ts";
import { ActivityUndo } from "./history/activity-undo.ts";
import { JournalStore } from "./history/journal-store.ts";
import { KeyStore } from "./keys/key-store.ts";
import { createLogger } from "./logging/logger.ts";
import { createMcpServer } from "./mcp/mcp-server.ts";
import { SettingsStore } from "./settings/settings-store.ts";
import { SkillInbox } from "./skills/skill-inbox.ts";
import { SupportReminder } from "./support/support-reminder.ts";
import { createTransports } from "./transports/create-transports.ts";
import type { App } from "./types/app.ts";
import type { AppConfig } from "./types/config.ts";
import type { Logger } from "./types/logging.ts";
import { EditorLinks } from "./ui-api/editor-links.ts";
import { servePanels } from "./ui-api/serve-panels.ts";

/** Wires the server together from its environment. Nothing is connected yet. */
export async function createApp(projectDir: string): Promise<App> {
  const { config, warnings } = parseConfig(process.env, homedir());
  const logger = createLogger(config.logLevel, config.logFile);

  for (const warning of warnings) {
    logger.warn(warning);
  }

  const transports = await createTransports(config, logger, serverPackage.version);
  const docs = new DocsCache({
    cacheDir: config.cacheDir,
    apiVersion: framerApiPackage.version,
    logger,
  });
  const journal = new ActivityJournal({
    store: config.historyDir === null ? null : new JournalStore(config.historyDir),
    transports,
    logger,
  });
  const skills = openSkillInbox(config, journal, logger);
  const undo = new ActivityUndo(journal);
  const capabilities = new CapabilityTracker({ transports });
  const settings = new SettingsStore(config.settingsFile, logger);

  transports.readPluginFirstFrom(async () => (await settings.get()).pluginFirst);

  const services = {
    journal,
    undo,
    capabilities,
    settings,
    editor: new EditorLinks({
      transports,
      plugin: transports.pluginUi,
    }),
  };

  // The journal page shows the project the plugin is open in (two servers can share one plugin).
  servePanels(transports.pluginUi, {
    ...services,
    keys: new KeyStore(config.keysFile),
    pluginInfo: () => transports.pluginUi.pluginInfo(),
    shownProject: () =>
      transports.status().transports.find((transport) => transport.transport === "plugin")?.project ?? null,
    journalDir: config.historyDir,
  });

  const server = createMcpServer(
    {
      transports,
      docs,
      journal,
      undo,
      capabilities,
      localApp: { url: () => transports.pluginUi.localAppUrl() },
      settings,
      support: new SupportReminder({
        file: config.supportFile,
        enabled: config.supportReminders,
        settings,
        links: SUPPORT_LINKS,
      }),
      briefs: new BriefStore(config.briefsDir),
    },
    serverPackage.version,
  );

  return {
    server,
    transports,
    logger,
    close: async () => {
      skills?.close();
      await Promise.allSettled([transports.close(), server.close()]);
    },
  };
}

/**
 * The skills Claude activates in this conversation, for the journal (see SkillInbox). Only under Claude Code, which
 * names the conversation, and only with the journal on. Failing to open it costs the skills, never the server.
 */
function openSkillInbox(config: AppConfig, journal: ActivityJournal, logger: Logger): SkillInbox | null {
  const sessionId = process.env.CLAUDE_CODE_SESSION_ID?.trim();

  if (sessionId === undefined || sessionId === "" || config.historyDir === null) {
    return null;
  }

  try {
    return SkillInbox.open(config.skillNotesDir, sessionId, (note) => void journal.noteSkill(note));
  } catch (error) {
    logger.warn({ err: error }, "Could not open the skill inbox; the journal will not show skills");

    return null;
  }
}
