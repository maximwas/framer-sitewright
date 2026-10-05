import type { EntryDetailProps } from "../types/props.ts";
import { detailNodeItems } from "../utils/entry-detail.ts";
import { ImagePreviews } from "./ImagePreviews.tsx";
import { ItemChips } from "./ItemChips.tsx";

/** What the call read or made beyond its one line (the row shows that): the nodes to open, the images to look at. */
export function EntryDetail({ entry }: EntryDetailProps) {
  const { detail } = entry;

  if (detail === null) {
    return null;
  }

  const nodes = detailNodeItems(entry);

  return (
    <>
      {nodes.length > 0 && <ItemChips items={nodes} read={entry.effect === "read"} />}
      {detail.images.length > 0 && <ImagePreviews urls={detail.images} />}
    </>
  );
}
