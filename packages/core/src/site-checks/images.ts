import { FRAMER_IMAGE_ID, UNSPLASH_PHOTO_ID } from "../constants/site-checks.ts";
import { walk } from "../layout-audit/tree.ts";
import type { CheckedPage, SiteFinding, SiteImage } from "../types/site-checks.ts";
import { attributeText, finding } from "./values.ts";

/** An image control of a component instance: `$control__image`, `$control__photo`… */
const IMAGE_CONTROL = /^\$control__\w*(image|photo|picture|avatar)\w*$/i;

/** Every photo on a page: image fills and the image controls of component instances. */
export function imagesOf(page: CheckedPage): SiteImage[] {
  if (page.content === null) {
    return [];
  }

  return walk(page.content).flatMap((node) => {
    const fill = attributeText(node, "fill");
    const own =
      fill !== null && /^https?:\/\//.test(fill)
        ? [
            {
              page: page.path,
              nodeId: node.id,
              nodeName: node.name ?? null,
              url: fill,
              source: "fill" as const,
              alt: attributeText(node, "altText"),
            },
          ]
        : [];
    const controls = Object.entries(node.attributes ?? {}).flatMap(([name, value]) =>
      IMAGE_CONTROL.test(name) && typeof value === "string" && /^https?:\/\//.test(value)
        ? [
            {
              page: page.path,
              nodeId: node.id,
              nodeName: node.name ?? null,
              url: value,
              source: "control" as const,
              alt: null,
            },
          ]
        : [],
    );

    return [...own, ...controls];
  });
}

/** Which photo a URL shows: Framer's file id or Unsplash's photo id, else the URL without its query. */
export function photoKey(url: string): string {
  const framer = FRAMER_IMAGE_ID.exec(url)?.[1];
  const unsplash = UNSPLASH_PHOTO_ID.exec(url)?.[1];

  return framer === undefined
    ? unsplash === undefined
      ? (url.split("?")[0] ?? url)
      : `unsplash:${unsplash}`
    : `framer:${framer}`;
}

/**
 * The same photo on more than one layer (a page reads as padded with stock, two cards show the same people), and
 * image fills without alt text when the read shows alt text (`complete`).
 */
export function imageFindings(images: readonly SiteImage[], complete: boolean): SiteFinding[] {
  const byPhoto = new Map<string, SiteImage[]>();

  for (const image of images) {
    byPhoto.set(photoKey(image.url), [...(byPhoto.get(photoKey(image.url)) ?? []), image]);
  }

  const repeated = [...byPhoto.values()].flatMap((uses) =>
    uses.length < 2
      ? []
      : uses.slice(1).map((use) =>
          finding(
            "repeated-photo",
            "likely",
            use.page,
            {
              type: "Node",
              id: use.nodeId,
              ...(use.nodeName === null ? {} : { name: use.nodeName }),
            },
            `The same photo is used ${uses.length} times (${uses.map(({ page, nodeName, nodeId }) => `${page} ${nodeName ?? nodeId}`).join(", ")}).`,
            "Give each place its own photo, from a different shoot.",
          ),
        ),
  );
  const missingAlt = complete
    ? images
        .filter((image) => image.source === "fill" && image.alt === null)
        .map((image) =>
          finding(
            "missing-alt",
            "likely",
            image.page,
            {
              type: "Node",
              id: image.nodeId,
              ...(image.nodeName === null ? {} : { name: image.nodeName }),
            },
            `${image.nodeName ?? image.nodeId} shows a photo without alt text.`,
            'Describe what it shows in altText (e.g. altText="A team mapping a process with sticky notes"); a purely decorative image gets altText="".',
          ),
        )
    : [];

  return [...repeated, ...missingAlt];
}
