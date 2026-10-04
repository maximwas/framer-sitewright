import { join } from "node:path";
import { confirm, intro, log, multiselect, note, outro, spinner } from "@clack/prompts";
import { errorMessage, PRODUCT } from "@sitewright/core";
import { CODEX_CONFIG_PATH, MCP_CLIENTS } from "../constants/clients.ts";
import { CLAUDE_SETTINGS_PATH } from "../constants/hooks.ts";
import type { KeyStore } from "../keys/key-store.ts";
import type { McpClient } from "../types/cli.ts";
import type { WizardContext } from "../types/wizard.ts";
import { answered } from "./cancel.ts";
import { addToClaudeCode, addToCursor, clientConfigBlock, codexBlock, detectClients } from "./clients.ts";
import { installSkill } from "./install-skill.ts";
import { addKeyFlow } from "./key-flow.ts";
import { chooseSettings } from "./settings-flow.ts";
import { setupHooks } from "./setup-hooks.ts";

/**
 * The setup wizard, `npx sitewright` in a terminal: where to connect the MCP server, Server API keys for any number of
 * projects, the skill hooks, and what to do in Framer. Every step can be skipped; Ctrl+C stops it where it is.
 */
export async function runWizard(context: WizardContext): Promise<void> {
  intro(`${PRODUCT.title}: AI agents for your Framer sites`);

  const clients = await chooseClients(context.homeDir);

  for (const client of clients) {
    await connectClient(client, context);
  }

  await addKeys(context.keys, context.bridgeFile);
  await chooseSettings(context.settings);

  if (clients.includes("claude-code")) {
    await offerSkill(context);
    await offerHooks(context);
  }

  note(
    [
      "1. Open your project in Framer → Plugins → Sitewright.",
      "2. Click Connect and keep the small journal window open.",
      "3. Ask your agent to build or change something.",
      "",
      `More keys later: ${PRODUCT.packageName} key   Journal: ${PRODUCT.packageName} open`,
    ].join("\n"),
    "Next, in Framer",
  );
  outro("Done.");
}

async function chooseClients(homeDir: string): Promise<McpClient[]> {
  const found = detectClients(homeDir);

  return answered(
    await multiselect({
      message: "Where should Sitewright be available? (space to pick, enter to go on)",
      options: MCP_CLIENTS.map(({ value, label }) => ({
        value,
        label,
        ...(found.includes(value) ? { hint: "found on this computer" } : {}),
      })),
      initialValues: found,
      required: false,
    }),
  );
}

async function connectClient(client: McpClient, { server, homeDir }: WizardContext): Promise<void> {
  try {
    switch (client) {
      case "claude-code": {
        const working = spinner();

        working.start("Adding to Claude Code…");

        const outcome = await addToClaudeCode(server, async () => {
          working.stop("Claude Code has Sitewright already.");

          return answered(await confirm({ message: "Replace it with this one?" }));
        });

        log.success(outcome);

        return;
      }
      case "cursor":
        log.success(await addToCursor(server, homeDir));

        return;
      case "codex":
        note(codexBlock(server), `Add to ${join(homeDir, ...CODEX_CONFIG_PATH)}`);

        return;
      case "other":
        note(clientConfigBlock(server), "Add to your MCP client's config");

        return;
    }
  } catch (error) {
    log.error(errorMessage(error));
  }
}

/** Keys for as many projects as the person wants; each one is optional. */
async function addKeys(keys: KeyStore, bridgeFile: string): Promise<void> {
  note(
    [
      "Without a key, Sitewright works through the Framer plugin: design system and pages from frames and text.",
      "A project's Server API key adds effects, variants, components, rich text, screenshots and catalogs.",
      "Each project has its own key (Site Settings → General → API Keys). Keys stay on this computer.",
    ].join("\n"),
    "Server API keys",
  );

  let more = answered(
    await confirm({
      message: "Add a project's key now?",
      initialValue: false,
    }),
  );

  while (more) {
    await addKeyFlow(keys, bridgeFile);
    more = answered(
      await confirm({
        message: "Add another project?",
        initialValue: false,
      }),
    );
  }
}

async function offerSkill({ homeDir }: WizardContext): Promise<void> {
  const wanted = answered(
    await confirm({
      message:
        "Add the Sitewright skill to Claude Code? (how to build sites that look designed: layout rules and checks)",
      initialValue: true,
    }),
  );

  if (!wanted) {
    return;
  }

  try {
    log.success(await installSkill(homeDir));
  } catch (error) {
    log.error(errorMessage(error));
  }
}

async function offerHooks({ hookCommand, homeDir }: WizardContext): Promise<void> {
  const wanted = answered(
    await confirm({
      message: `Show the skills Claude uses in the journal? (adds two background hooks to ~/${CLAUDE_SETTINGS_PATH.join("/")})`,
      initialValue: true,
    }),
  );

  if (!wanted) {
    return;
  }

  try {
    log.success(await setupHooks(hookCommand, true, homeDir));
  } catch (error) {
    log.error(errorMessage(error));
  }
}
