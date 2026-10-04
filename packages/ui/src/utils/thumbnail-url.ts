import { THUMBNAIL_PX } from "../constants/activity.ts";

/**
 * A small version of a preview image: Framer's CDN and Unsplash both scale on request, so the panel never loads a
 * full-size photo. Other URLs are left as they are.
 */
export function thumbnailUrl(url: string): string {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "framerusercontent.com") {
      parsed.searchParams.set("scale-down-to", String(THUMBNAIL_PX));
    } else if (parsed.hostname === "images.unsplash.com") {
      parsed.searchParams.set("w", String(THUMBNAIL_PX));
    }

    return parsed.toString();
  } catch {
    return url;
  }
}
