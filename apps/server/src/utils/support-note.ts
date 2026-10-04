import { PRODUCT, type SupportLink } from "@sitewright/core";

/** The one sentence Claude passes on: the project is free, and where to support it. */
export function supportNote(links: readonly SupportLink[]): string {
  const where = links.map(({ label, url }) => `${label} (${url})`).join(", ");

  return `${PRODUCT.title} is free and open source. If it saves you time, you can support its development: ${where}.`;
}
