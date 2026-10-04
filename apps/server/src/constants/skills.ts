/** The most a hook reads from stdin: its input is one tool call, far below this. */
export const HOOK_INPUT_MAX_BYTES = 1_048_576;

/** Skills noted before the session knows its project wait for it, at most this many and this long. */
export const SKILL_NOTE_PENDING_MAX = 20;

export const SKILL_NOTE_PENDING_MS = 15 * 60_000;

/** A skill's own file: read through Read, it is the skill's activation, not one of its references. */
export const SKILL_ENTRY_FILE = "skill.md";

/** A session's inbox: `<session>.<pid>.jsonl`, one per sitewright process of the session. */
export const SKILL_INBOX_FILE = /^(.+)\.(\d+)\.jsonl$/;
