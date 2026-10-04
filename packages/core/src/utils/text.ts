import { PREVIEW_IMAGE_ORIGINS, PREVIEW_IMAGE_URL } from "../constants/history.ts";

/** "1 node", "24 nodes": a count with its noun. */
export function countOf(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** At most `max` characters, with an ellipsis when cut. */
export function clipText(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Whether the panel may preview `url`: it comes from one of PREVIEW_IMAGE_ORIGINS. */
export function isPreviewImage(url: string): boolean {
  return PREVIEW_IMAGE_ORIGINS.some((origin) => url.startsWith(`${origin}/`));
}

/** Image URLs from Framer's CDN or Unsplash inside `text`, e.g. the fills of a design_apply batch, without repeats. */
export function previewImagesIn(text: string): string[] {
  return [...new Set(text.match(PREVIEW_IMAGE_URL) ?? [])];
}
