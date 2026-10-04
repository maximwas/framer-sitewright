import { SKILL_HOOK_MATCHERS, SKILL_HOOK_TIMEOUT_S } from "../constants/hooks.ts";

/**
 * Claude Code settings with the skill hooks added under hooks.PostToolUse, everything else kept as it was; `changed` is
 * false when every hook was there already. Throws when the settings are not a JSON object: better no change than a
 * broken file.
 */
export function mergeHookSettings(settings: unknown, command: string): { settings: object; changed: boolean } {
  if (!isRecord(settings)) {
    throw new Error("Claude Code settings must be a JSON object.");
  }

  const hooks = settings.hooks ?? {};

  if (!isRecord(hooks) || !Array.isArray(hooks.PostToolUse ?? [])) {
    throw new Error("Claude Code settings have an unexpected hooks section.");
  }

  const postToolUse: unknown[] = [...((hooks.PostToolUse as unknown[] | undefined) ?? [])];
  const missing = SKILL_HOOK_MATCHERS.filter((wanted) => !postToolUse.some((group) => hasHook(group, wanted, command)));

  if (missing.length === 0) {
    return {
      settings,
      changed: false,
    };
  }

  return {
    settings: {
      ...settings,
      hooks: {
        ...hooks,
        PostToolUse: [...postToolUse, ...missing.map((wanted) => hookGroup(wanted, command))],
      },
    },
    changed: true,
  };
}

/** The PostToolUse groups `setup --hooks` adds, to print them. */
export function skillHookGroups(command: string): object[] {
  return SKILL_HOOK_MATCHERS.map((wanted) => hookGroup(wanted, command));
}

function hookGroup({ matcher, if: condition }: (typeof SKILL_HOOK_MATCHERS)[number], command: string): object {
  return {
    matcher,
    hooks: [
      {
        type: "command",
        ...(condition === undefined ? {} : { if: condition }),
        command,
        async: true,
        timeout: SKILL_HOOK_TIMEOUT_S,
      },
    ],
  };
}

function hasHook(group: unknown, { matcher }: (typeof SKILL_HOOK_MATCHERS)[number], command: string): boolean {
  return (
    isRecord(group) &&
    group.matcher === matcher &&
    Array.isArray(group.hooks) &&
    group.hooks.some((hook) => isRecord(hook) && hook.command === command)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
