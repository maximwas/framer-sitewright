import type { FileBytes } from "../types/framer-port.ts";

// Both runtimes have atob (the plugin's browser and Node); core's lib has no DOM.
declare const atob: (data: string) => string;

/** The bytes and type of a base64 data URL (`data:video/webm;base64,…`), or null for anything else. */
export function dataUrlBytes(url: string): FileBytes | null {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(url);

  if (match?.[1] === undefined || match[2] === undefined) {
    return null;
  }

  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return {
    bytes,
    mimeType: match[1],
  };
}
