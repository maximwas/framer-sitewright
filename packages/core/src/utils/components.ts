import { FRAMER_AGENT_TOOL_NAMES, PLACEMENT_ATTRIBUTES } from "../constants/components.ts";

/** Framer's agent message with its internal tool names swapped for the Sitewright tools that do the same. */
export function inSitewrightTerms(message: string): string {
  return Object.entries(FRAMER_AGENT_TOOL_NAMES).reduce(
    (text, [framerName, toolName]) => text.replaceAll(framerName, toolName),
    message,
  );
}

/** The placement attributes `source` has that `target` differs in: what `target` must take over to sit as it did. */
export function placementChanges(
  source: Readonly<Record<string, unknown>>,
  target: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return Object.fromEntries(
    PLACEMENT_ATTRIBUTES.flatMap((key) =>
      source[key] === undefined || source[key] === target[key] ? [] : [[key, source[key]] as const],
    ),
  );
}
