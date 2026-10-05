import { PRODUCT, SUPPORT_LINKS } from "@sitewright/core";

/** Where to support the project, as plain links; nothing until there are links to show. */
export function SupportLinks() {
  if (SUPPORT_LINKS.length === 0) {
    return null;
  }

  return (
    <p className="text-[12px] text-sw-ink-3">
      {PRODUCT.title} is free.{" "}
      {SUPPORT_LINKS.map(({ label, url }, index) => (
        <span key={url}>
          {index > 0 && " · "}
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sw-accent-ink underline">
            {label}
          </a>
        </span>
      ))}
    </p>
  );
}
