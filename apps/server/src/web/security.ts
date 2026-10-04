import { PREVIEW_IMAGE_ORIGINS } from "@sitewright/core";
import { FONT_ORIGIN } from "../constants/web.ts";

/** Only this server's own names: another Host is a DNS-rebinding attempt. */
export function isOwnHost(host: string | undefined, port: number): boolean {
  return host === `127.0.0.1:${port}` || host === `localhost:${port}`;
}

/**
 * Headers of every response: a strict CSP (own scripts, own socket, Framer's font, image previews from Framer's CDN and
 * Unsplash only), no framing, no referrer. No Cross-Origin-Opener-Policy: the plugin that opened the bridge window talks
 * to it through window.opener, which that header would cut.
 */
export function securityHeaders(port: number): Record<string, string> {
  const sockets = `ws://127.0.0.1:${port} ws://localhost:${port}`;

  return {
    "Content-Security-Policy": [
      "default-src 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      `font-src ${FONT_ORIGIN}`,
      `img-src 'self' data: ${PREVIEW_IMAGE_ORIGINS.join(" ")}`,
      `connect-src 'self' ${sockets}`,
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join("; "),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Cache-Control": "no-store",
  };
}
