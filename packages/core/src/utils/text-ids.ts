/**
 * The id of a rich text's block or run at `index` under `parentId`: `v:<text id>:<n>` under the text itself,
 * `<block id>:<n>` under a block. Framer derives these from position, so they are never stored.
 */
export function positionalChildId(parentId: string, index: number): string {
  return `${parentId.startsWith("v:") ? parentId : `v:${parentId}`}:${index}`;
}
