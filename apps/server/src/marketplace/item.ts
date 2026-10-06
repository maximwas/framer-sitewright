import { randomUUID } from "node:crypto";
import { componentInsert, errorMessage, nodesRead, OperationError, pagesCreate, pagesDelete } from "@sitewright/core";
import { INSPECT_PAGE_NAME, MARKETPLACE_TIMEOUT_MS, MARKETPLACE_USER_AGENT } from "../constants/marketplace.ts";
import type { TransportRouter } from "../transports/router.ts";
import type { MarketplaceItemDetail } from "../types/marketplace.ts";
import { itemPageUrl, parseMarketplaceItem } from "../utils/marketplace.ts";

/** A component's control as an inserted instance holds it: its name and default value. */
export interface InspectedControl {
  readonly name: string;
  readonly value: string;
}

/**
 * Marketplace items by their pages: what each one is, who made it, its price, preview and module URL. With `inspect`,
 * a free component is inserted on a temporary design page, its controls are read with their defaults, and the page is
 * deleted again, so the agent can judge whether it fits before putting it on the site.
 */
export async function marketplaceItems(transports: TransportRouter, links: readonly string[], inspect: boolean) {
  const items = [];

  for (const link of links) {
    const pageUrl = itemPageUrl(link);

    if (pageUrl === null) {
      throw new OperationError(
        "INVALID_INPUT",
        `"${link}" is not a Marketplace item link.`,
        "Pass a link like https://www.framer.com/marketplace/components/stacked-slider/, or a pageUrl from marketplace_browse.",
      );
    }

    const item = await fetchItem(pageUrl);
    const inspection =
      inspect && item.moduleUrl !== null
        ? await inspectComponent(transports, item.moduleUrl)
        : {
            controls: null,
            note: inspect
              ? item.kind === "template"
                ? "A template: remix it from remixUrl to look inside."
                : "A paid component: it has no module URL until it is bought; judge it by its preview."
              : null,
          };

    items.push({
      ...item,
      categories: [...item.categories],
      ...inspection,
    });
  }

  return { items };
}

async function fetchItem(pageUrl: string): Promise<MarketplaceItemDetail> {
  const response = await fetch(pageUrl, {
    headers: {
      "user-agent": MARKETPLACE_USER_AGENT,
      accept: "text/html",
    },
    signal: AbortSignal.timeout(MARKETPLACE_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new OperationError(
      "NOT_FOUND",
      `The Marketplace answered ${response.status} for ${pageUrl}.`,
      "Check the link.",
    );
  }

  const item = parseMarketplaceItem(await response.text());

  if (item === null) {
    throw new OperationError("NOT_FOUND", `No Marketplace item found at ${pageUrl}.`, "Check the link.");
  }

  return item;
}

/** Inserts the component on a throwaway design page, reads its controls, and deletes the page whatever happens. */
async function inspectComponent(
  transports: TransportRouter,
  moduleUrl: string,
): Promise<{ controls: InspectedControl[] | null; note: string | null }> {
  // A name of its own, so the cleanup never takes a page left by an earlier run.
  const designPage = `${INSPECT_PAGE_NAME} ${randomUUID().slice(0, 8)}`;
  let created = false;

  try {
    const page = await transports.run(pagesCreate, { designPage });

    created = true;

    const { nodeId } = await transports.run(componentInsert, {
      url: moduleUrl,
      parentId: page.id,
    });
    const read = await transports.run(nodesRead, {
      nodeId,
      depth: 0,
      format: "json",
    });
    const attributes = (read as { node?: { attributes?: Record<string, unknown> } }).node?.attributes ?? {};
    const controls = Object.entries(attributes).flatMap(([name, value]) =>
      name.startsWith("$control__")
        ? [
            {
              name: name.slice("$control__".length),
              value: typeof value === "string" ? value : JSON.stringify(value),
            },
          ]
        : [],
    );

    return {
      controls,
      note:
        controls.length === 0
          ? "No controls were readable: without a Server API key the Plugin API does not show them."
          : null,
    };
  } catch (error) {
    return {
      controls: null,
      note: `Could not insert it to read its controls: ${errorMessage(error)}`,
    };
  } finally {
    if (created) {
      await transports.run(pagesDelete, { designPage }).catch(() => undefined);
    }
  }
}
