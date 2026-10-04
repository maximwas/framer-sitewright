const utf8 = new TextEncoder();

/** Whether `text` takes more than `maxBytes` in UTF-8. A UTF-16 unit is at most 3 bytes, so most texts skip the count. */
export function exceedsBytes(text: string, maxBytes: number): boolean {
  return text.length * 3 > maxBytes && utf8.encode(text).byteLength > maxBytes;
}
