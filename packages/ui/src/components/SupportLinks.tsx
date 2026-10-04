import { PRODUCT, SUPPORT_LINKS } from "@sitewright/core";

/** Where to support the project, as plain links; nothing until there are links to show. */
export function SupportLinks() {
  if (SUPPORT_LINKS.length === 0) {
    return null;
  }

  return (
    <p className="text-framer-text-tertiary">
      {PRODUCT.title} is free.{" "}
      {SUPPORT_LINKS.map(({ label, url }, index) => (
        <span key={url}>
          {index > 0 && " · "}
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-framer-tint underline">
            {label}
          </a>
        </span>
      ))}
    </p>
  );
}
