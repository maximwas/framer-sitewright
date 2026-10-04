/** A canvas node's layer name, from whatever getNode returned; null when it has none. */
export function nodeNameOf(node: unknown): string | null {
  return typeof node === "object" && node !== null && "name" in node && typeof node.name === "string"
    ? node.name
    : null;
}
