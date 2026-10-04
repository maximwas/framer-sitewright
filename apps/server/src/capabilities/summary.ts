import type { Capabilities, CapabilityProbe, PlanLimit } from "@sitewright/core";
import { BRANCH_ACCESS_SUMMARIES } from "../constants/capabilities.ts";
import { asSentence } from "../utils/text.ts";

/** Branch access and the plan limits calls ran into, with one summary for the model and the plugin window. */
export function summarizeCapabilities(probe: CapabilityProbe, limits: readonly PlanLimit[]): Capabilities {
  const branchSummary =
    probe.branches === "unknown"
      ? asSentence(probe.detail ?? "The plan could not be checked")
      : BRANCH_ACCESS_SUMMARIES[probe.branches];
  const limitSummaries = limits.map((limit) => `${limit.tool} failed on plan grounds: ${asSentence(limit.message)}`);

  return {
    branches: probe.branches,
    limits: [...limits],
    limited: probe.branches === "unavailable" || limits.length > 0,
    summary: [branchSummary, ...limitSummaries].join(" "),
  };
}
