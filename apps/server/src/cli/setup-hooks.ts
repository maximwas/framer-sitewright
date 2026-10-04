import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CLAUDE_SETTINGS_PATH } from "../constants/hooks.ts";
import { mergeHookSettings, skillHookGroups } from "../utils/hook-settings.ts";

/**
 * `setup --hooks`: the Claude Code hooks that put the skills Claude uses into the journal. Without `yes`, prints the
 * block to add; with it, adds the block to ~/.claude/settings.json (a copy of the old file goes next to it), unless it
 * is there already. Resolves with the text to print; rejects when the settings file cannot be read as JSON.
 */
export async function setupHooks(command: string, yes: boolean, homeDir: string): Promise<string> {
  const file = join(homeDir, ...CLAUDE_SETTINGS_PATH);

  if (!yes) {
    return [
      `Add this to ${file} (or run again with --yes to add it for you):`,
      "",
      JSON.stringify({ hooks: { PostToolUse: skillHookGroups(command) } }, null, 2),
      "",
      "Restart Claude Code afterwards: it loads hooks when it starts.",
    ].join("\n");
  }

  const current = await readSettings(file);
  const { settings, changed } = mergeHookSettings(current ?? {}, command);

  if (!changed) {
    return `The skill hooks are in ${file} already.`;
  }

  if (current !== null) {
    await copyFile(file, `${file}.bak`);
  }

  await writeFile(file, `${JSON.stringify(settings, null, 2)}\n`);

  return [
    `Added the skill hooks to ${file}${current === null ? "" : ` (the old file is ${file}.bak)`}.`,
    "Restart Claude Code: it loads hooks when it starts. The journal then shows the skills Claude uses.",
  ].join("\n");
}

/** The settings as JSON, or null when there is no file yet. */
async function readSettings(file: string): Promise<unknown> {
  let text: string;

  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `${file} is not valid JSON, so it was left as it is. Fix it, or add the hooks by hand (setup --hooks).`,
    );
  }
}
