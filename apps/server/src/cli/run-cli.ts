import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import { errorMessage, PRODUCT } from "@sitewright/core";
import packageJson from "../../package.json" with { type: "json" };
import { parseConfig } from "../config/config.ts";
import { loadEnvFile } from "../config/env-file.ts";
import type { AppConfig } from "../types/config.ts";
import { cliHelp } from "../utils/cli-help.ts";
import { hookCommand } from "../utils/hook-command.ts";
import { parseCliArgs } from "../utils/parse-cli.ts";
import { selfInvocation } from "../utils/self-invocation.ts";
import { setupInstructions } from "../utils/setup-instructions.ts";

/** Runs what the command line asks for. Only "mcp" keeps the process alive; the MCP server owns stdout then. */
export async function runCli(argv: readonly string[]): Promise<void> {
  const command = parseCliArgs(argv);

  switch (command.kind) {
    case "mcp": {
      // A person in a terminal gets the setup wizard; MCP clients start the server through pipes, never a terminal.
      if (inTerminal()) {
        await interactive(() => wizard());

        return;
      }

      const { startMcp } = await import("../main.ts");

      await startMcp();

      return;
    }
    case "setup": {
      if (command.skill) {
        const { installSkill } = await import("./install-skill.ts");

        try {
          print(await installSkill(homedir()));
        } catch (error) {
          process.stderr.write(`${errorMessage(error)}\n`);
          process.exitCode = 1;
        }

        return;
      }

      if (!command.hooks) {
        if (command.print || !inTerminal()) {
          print(setupInstructions(PRODUCT.packageName));
        } else {
          await interactive(() => wizard());
        }

        return;
      }

      const { setupHooks } = await import("./setup-hooks.ts");
      const script = realpathSync(process.argv[1] ?? "");

      try {
        print(await setupHooks(hookCommand(script, process.execPath), command.yes, homedir()));
      } catch (error) {
        process.stderr.write(`${errorMessage(error)}\n`);
        process.exitCode = 1;
      }

      return;
    }
    case "key": {
      // Adding and removing ask questions; the list does not, so scripts and agents can read it.
      if (command.action !== "list" && !inTerminal()) {
        process.stderr.write("`key` asks questions: run it in a terminal (`key list` works anywhere).\n");
        process.exitCode = 1;

        return;
      }

      const action = command.action;

      await interactive(async () => {
        const { KeyStore } = await import("../keys/key-store.ts");
        const flows = await import("./key-flow.ts");
        const config = localConfig();
        const keys = new KeyStore(config.keysFile);

        if (action === "list") {
          flows.listKeys(keys);
        } else if (action === "remove") {
          await flows.removeKeyFlow(keys);
        } else {
          await flows.addKeyFlow(keys, config.bridgeFile);
        }
      });

      return;
    }
    case "settings": {
      const { SettingsStore } = await import("../settings/settings-store.ts");
      const { createLogger } = await import("../logging/logger.ts");
      const { chooseSettings, describeSettings } = await import("./settings-flow.ts");
      const store = new SettingsStore(localConfig().settingsFile, createLogger("silent"));

      if (Object.keys(command.changes).length > 0) {
        print(describeSettings(await store.set(command.changes)));
      } else if (command.print || !inTerminal()) {
        print(describeSettings(await store.get()));
      } else {
        await interactive(async () => {
          await chooseSettings(store);
        });
      }

      return;
    }
    case "hook": {
      const { runHook } = await import("./run-hook.ts");

      await runHook(process.stdin, localConfig().skillNotesDir);

      return;
    }
    case "open": {
      const { openLocalApp } = await import("./open-local-app.ts");
      const { ok, message } = await openLocalApp(localConfig().bridgeFile);

      if (ok) {
        print(message);
      } else {
        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
      }

      return;
    }
    case "logs": {
      const { followLog } = await import("../logging/follow-log.ts");

      await followLog(localConfig().logFile, print);

      return;
    }
    case "version":
      print(packageJson.version);

      return;
    case "help":
      print(cliHelp());

      return;
    case "unknown":
      process.stderr.write(`Unknown command or option "${command.argument}".\n\n${cliHelp()}\n`);
      process.exitCode = 1;
  }
}

/** Both ends of the terminal are a person's: then the CLI may ask questions. */
function inTerminal(): boolean {
  return process.stdin.isTTY && process.stdout.isTTY;
}

/** The setup wizard, started the way this CLI was started. */
async function wizard(): Promise<void> {
  const [{ runWizard }, { KeyStore }, { SettingsStore }, { createLogger }] = await Promise.all([
    import("./wizard.ts"),
    import("../keys/key-store.ts"),
    import("../settings/settings-store.ts"),
    import("../logging/logger.ts"),
  ]);
  const config = localConfig();
  const script = realpathSync(process.argv[1] ?? "");

  await runWizard({
    server: selfInvocation(script, process.execPath),
    hookCommand: hookCommand(script, process.execPath),
    homeDir: homedir(),
    keys: new KeyStore(config.keysFile),
    settings: new SettingsStore(config.settingsFile, createLogger("silent")),
    bridgeFile: config.bridgeFile,
  });
}

/** Runs prompts; backing out (Ctrl+C) ends quietly, any other failure is reported with exit code 1. */
async function interactive(run: () => Promise<void>): Promise<void> {
  const { SetupCancelled } = await import("./cancel.ts");

  try {
    await run();
  } catch (error) {
    if (error instanceof SetupCancelled) {
      process.stdout.write("Cancelled.\n");

      return;
    }

    process.stderr.write(`${errorMessage(error)}\n`);
    process.exitCode = 1;
  }
}

/** The same paths the MCP server uses: its environment, and `.env` of the project Claude Code runs in. */
function localConfig(): AppConfig {
  loadEnvFile(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());

  return parseConfig(process.env, homedir()).config;
}

function print(text: string): void {
  process.stdout.write(`${text}\n`);
}
