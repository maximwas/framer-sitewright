import type { ImagePreviewsProps } from "../types/props.ts";
import { thumbnailUrl } from "../utils/thumbnail-url.ts";

/** Small previews of the images an entry uploaded, found or put into the design. */
export function ImagePreviews({ urls }: ImagePreviewsProps) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {urls.map((url) => (
        <li key={url}>
          <img
            src={thumbnailUrl(url)}
            alt=""
            title={url}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-14 max-w-[120px] rounded-md bg-framer-bg-secondary object-cover ring-1 ring-black/10 ring-inset"
          />
        </li>
      ))}
    </ul>
  );
}
