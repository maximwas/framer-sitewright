import { PRODUCT, setupCommands } from "@sitewright/core";
import type { SetupStep } from "../types/ui.ts";

const commands = setupCommands(PRODUCT.packageName);

/** How to set Sitewright up, in the order the plugin shows it. */
export const SETUP_STEPS: readonly SetupStep[] = [
  {
    title: "Run the setup in a terminal",
    note: "It connects Claude Code, Cursor or Codex, and can add your project keys and the skill hooks. Node.js 24.11 or newer.",
    command: commands.wizard,
  },
  {
    title: "Optional: this project's Server API key",
    note: "Adds effects, variants, components, rich text, screenshots and catalogs. Copy it from Site Settings → General → API Keys and add it in the journal (Settings), or here in a terminal. It stays on your computer.",
    command: commands.addKey,
  },
];
