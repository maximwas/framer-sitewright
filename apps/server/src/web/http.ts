import { type ServerResponse, STATUS_CODES } from "node:http";

/** The path of a request target, split off by hand: a malformed target must never throw, as `new URL` would. */
export function pathOf(target: string | undefined): string {
  return (target ?? "/").split("?")[0] ?? "/";
}

/** A plain-text status reply with the server's security headers. */
export function reply(response: ServerResponse, status: number, headers: Readonly<Record<string, string>>): void {
  response
    .writeHead(status, {
      ...headers,
      "Content-Type": "text/plain; charset=utf-8",
    })
    .end(STATUS_CODES[status] ?? "");
}
