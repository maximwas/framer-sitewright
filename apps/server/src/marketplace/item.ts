import { randomUUID } from "node:crypto";
import {
  componentInsert,
  componentsRead,
  errorMessage,
  nodesRead,
  OperationError,
  pagesCreate,
  pagesDelete,
} from "@sitewright/core";
import {
  CONTROL_PREFIX,
  INSPECT_PAGE_PATH,
  MARKETPLACE_TIMEOUT_MS,
  MARKETPLACE_USER_AGENT,
} from "../constants/marketplace.ts";
import type { TransportRouter } from "../transports/router.ts";
import type { MarketplaceItemDetail } from "../types/marketplace.ts";
import { itemPageUrl, parseMarketplaceItem } from "../utils/marketplace.ts";

/** A component's control as an inserted instance holds it: its name, default value, type and the tool that sets it. */
export interface InspectedControl {
  readonly name: string;
  readonly value: string;
  readonly type: string | null;
  readonly write: "design_apply" | "component_controls_set" | null;
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
  // A web page of its own: a design page has no path, and the DSL read of a node on it failed ("not found on page /").
  const path = `${INSPECT_PAGE_PATH}-${randomUUID().slice(0, 8)}`;
  let created = false;

  try {
    const page = await transports.run(pagesCreate, { path });

    created = true;

    const { nodeId } = await transports.run(componentInsert, {
      url: moduleUrl,
      parentId: page.id,
    });
    const read = await transports.run(nodesRead, {
      nodeId,
      pagePath: path,
      depth: 0,
      format: "json",
    });
    const node = (read as { node?: { component?: unknown; attributes?: Record<string, unknown> } }).node;
    const types = typeof node?.component === "string" ? await controlTypes(transports, node.component) : {};
    const controls = Object.entries(node?.attributes ?? {}).flatMap(([name, value]) =>
      name.startsWith(CONTROL_PREFIX)
        ? [
            {
              name: name.slice(CONTROL_PREFIX.length),
              value: typeof value === "string" ? value : JSON.stringify(value),
              ...controlType(types[name]),
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
      await transports.run(pagesDelete, { path }).catch(() => undefined);
    }
  }
}

/** The component's control definitions by `$control__` name, from its component id; empty when unreadable. */
async function controlTypes(transports: TransportRouter, componentId: string): Promise<Record<string, unknown>> {
  try {
    const { components } = await transports.run(componentsRead, { ids: [componentId] });
    const controls = (components[0]?.controls as { controls?: unknown } | null)?.controls;

    return typeof controls === "object" && controls !== null ? (controls as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** A control's type in words, and the tool that writes it. */
function controlType(definition: unknown): { type: string | null; write: InspectedControl["write"] } {
  const type = describeType(definition);

  return {
    type,
    write: type === null ? null : /^(list|object|transition)/.test(type) ? "component_controls_set" : "design_apply",
  };
}

function describeType(definition: unknown): string | null {
  if (typeof definition !== "object" || definition === null) {
    return null;
  }

  const { type, control, controls } = definition as { type?: unknown; control?: unknown; controls?: unknown };

  if (type === "array") {
    return `list of ${describeType(control) ?? "values"}`;
  }

  if (type === "object" && typeof controls === "object" && controls !== null) {
    return `object { ${Object.entries(controls)
      .map(([key, inner]) => `${key}: ${describeType(inner) ?? "value"}`)
      .join(", ")} }`;
  }

  if (typeof type !== "string") {
    return null;
  }

  // Framer spells colors and fonts out as their accepted formats.
  return type.includes("var(--token") ? "color" : type.startsWith("fontSelector") ? "font" : type;
}
