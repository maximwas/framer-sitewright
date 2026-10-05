/** The file's first bytes match its type: a key or a text file renamed to .mp4 does not pass for a video. */
export function hasFileSignature(mimeType: string, bytes: Uint8Array): boolean {
  const ascii = (start: number, end: number) => Buffer.from(bytes.subarray(start, end)).toString("latin1");

  switch (mimeType) {
    case "video/webm":
      return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    case "video/mp4":
    case "video/quicktime":
      return ["ftyp", "moov", "mdat", "wide", "free"].includes(ascii(4, 8));
    case "application/pdf":
      return ascii(0, 5) === "%PDF-";
    case "font/woff":
      return ascii(0, 4) === "wOFF";
    case "font/woff2":
      return ascii(0, 4) === "wOF2";
    case "font/ttf":
      return bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0;
    case "font/otf":
      return ascii(0, 4) === "OTTO";
    default:
      return false;
  }
}
