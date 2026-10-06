import { PRIVATE_HOSTS, WEB_URL_HOST } from "../constants/screenshots.ts";

/**
 * Whether `value` is an http(s) URL on a public host: not this machine, a private network or a bare name. Core runs
 * where `URL` may be missing from the types, so the host is read with a pattern.
 */
export function isPublicWebUrl(value: string): boolean {
  const host = WEB_URL_HOST.exec(value.trim())?.[1]?.toLowerCase();

  // IPv6 hosts come in brackets: "[::1]".
  return host !== undefined && !PRIVATE_HOSTS.some((pattern) => pattern.test(host.replace(/^\[(.*)\]$/, "$1")));
}
