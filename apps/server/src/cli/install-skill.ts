import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { SKILL_INSTALL_PATH } from "../constants/cli.ts";
import { knowledgeFile } from "../knowledge/guide.ts";

/**
 * Puts the Sitewright skill where Claude Code loads skills, or brings an older copy up to date (keeping it as .bak).
 * The skill only points at design_guide, so the guide itself always comes from the installed server.
 */
export async function installSkill(homeDir: string): Promise<string> {
  const source = knowledgeFile("skill/SKILL.md");
  const target = join(homeDir, ...SKILL_INSTALL_PATH);
  const [wanted, current] = await Promise.all([readFile(source, "utf8"), readFile(target, "utf8").catch(() => null)]);

  if (current === wanted) {
    return `The Sitewright skill is installed already (${target}).`;
  }

  await mkdir(dirname(target), { recursive: true });

  if (current !== null) {
    await copyFile(target, `${target}.bak`);
  }

  await copyFile(source, target);

  return `${current === null ? "Installed" : "Updated"} the Sitewright skill for Claude Code (${target}). Restart Claude Code to load it.`;
}
