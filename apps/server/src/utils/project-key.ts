import { KEY_HINT_LENGTH, PROJECT_LINK } from "../constants/keys.ts";

/** The editor link to connect by, from whatever the address bar held; null when it is no Framer project link. */
export function projectUrlOf(text: string): string | null {
  const slug = PROJECT_LINK.exec(text.trim())?.[1];

  return slug === undefined ? null : `https://framer.com/projects/${slug}`;
}

/** The end of a key, enough to recognize it, never enough to use it. */
export function keyHint(key: string): string {
  return `…${key.slice(-KEY_HINT_LENGTH)}`;
}
