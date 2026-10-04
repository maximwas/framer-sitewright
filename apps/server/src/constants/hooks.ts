/** What `setup --hooks` puts under hooks.PostToolUse: the hook runs in the background (async) and only for skills. */
export const SKILL_HOOK_MATCHERS: readonly { readonly matcher: string; readonly if?: string }[] = [
  { matcher: "Skill" },
  {
    matcher: "Read",
    // Permission rule syntax: "//" is an absolute path, so a skill's files match wherever the skill is installed.
    if: "Read(//**/skills/**)",
  },
];

/** Seconds Claude Code gives the hook before it stops it. */
export const SKILL_HOOK_TIMEOUT_S = 30;

/** Claude Code's user settings, where `setup --hooks --yes` installs the hooks. */
export const CLAUDE_SETTINGS_PATH = [".claude", "settings.json"] as const;
