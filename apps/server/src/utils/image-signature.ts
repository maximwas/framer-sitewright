/** The file's first bytes match its image type: a renamed text file or key does not pass for a picture. */
export function hasImageSignature(mimeType: string, bytes: Uint8Array): boolean {
  const ascii = (start: number, end: number) => Buffer.from(bytes.subarray(start, end)).toString("latin1");

  switch (mimeType) {
    case "image/png":
      return ascii(0, 4) === "\x89PNG";
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/gif":
      return ascii(0, 4) === "GIF8";
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "image/avif":
      return ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12));
    case "image/svg+xml":
      return /<svg[\s>]/i.test(ascii(0, 4096));
    default:
      return false;
  }
}
