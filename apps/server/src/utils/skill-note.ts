import { SKILL_ENTRY_FILE } from "../constants/skills.ts";
import type { HookInput, SkillNote } from "../types/skills.ts";

/**
 * What a PostToolUse hook says about skills: the Skill tool activates one by name; a Read of a file under a `skills/`
 * folder is a look into a skill (its SKILL.md: the activation itself; any other Markdown file: one of its references).
 * Anything else is no note.
 */
export function skillNoteOf(input: HookInput, at: string): SkillNote | null {
  const toolInput = input.tool_input ?? {};

  if (input.tool_name === "Skill") {
    const skill = typeof toolInput.skill === "string" ? toolInput.skill.trim() : "";

    return skill === ""
      ? null
      : {
          at,
          skill,
          reference: null,
        };
  }

  if (input.tool_name !== "Read" || typeof toolInput.file_path !== "string") {
    return null;
  }

  return readNote(toolInput.file_path, at);
}

/** The name a session's inbox files start with: the session id, safe as a file name. */
export function inboxPrefix(sessionId: string): string {
  return `${sessionId.replace(/[^A-Za-z0-9_-]/g, "_")}.`;
}

/** `…/skills/<skill>/…/<file>.md`, by the innermost `skills` folder (a project's skills may sit inside another tree). */
function readNote(path: string, at: string): SkillNote | null {
  const parts = path.replaceAll("\\", "/").split("/");
  const folder = parts.lastIndexOf("skills");
  const skill = parts[folder + 1];
  const file = parts.at(-1);

  if (folder === -1 || folder + 2 >= parts.length || skill === undefined || file === undefined) {
    return null;
  }

  if (!file.toLowerCase().endsWith(".md")) {
    return null;
  }

  return {
    at,
    skill,
    reference: file.toLowerCase() === SKILL_ENTRY_FILE ? null : file,
  };
}
