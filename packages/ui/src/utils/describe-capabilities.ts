import type { Capabilities } from "@sitewright/core";

/** What the plan banner tells the user; the capabilities' own summary is written for the model. */
export function describeCapabilities(capabilities: Capabilities): string[] {
  const lines = capabilities.limits.map((limit) => limit.message);

  if (capabilities.branches === "unavailable") {
    lines.unshift("This project's plan is below Pro: no branches, and some features of higher plans may not work.");
  }

  return [...new Set(lines)];
}
