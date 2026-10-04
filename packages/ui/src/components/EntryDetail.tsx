import type { EntryDetailProps } from "../types/props.ts";
import { detailLine, detailNodeItems } from "../utils/entry-detail.ts";
import { ImagePreviews } from "./ImagePreviews.tsx";
import { ItemChips } from "./ItemChips.tsx";

/** What the call read or made: its subject and result in one line, the nodes to open, the images to look at. */
export function EntryDetail({ entry }: EntryDetailProps) {
  const { detail } = entry;

  if (detail === null) {
    return null;
  }

  const line = detailLine(detail);
  const nodes = detailNodeItems(entry);

  return (
    <>
      {line !== null && <p className="break-words text-framer-text-secondary">{line}</p>}
      {nodes.length > 0 && <ItemChips items={nodes} read={entry.effect === "read"} />}
      {detail.images.length > 0 && <ImagePreviews urls={detail.images} />}
    </>
  );
}
