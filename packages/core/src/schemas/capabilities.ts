import * as z from "zod";

/** Whether the project has branches, the one plan signal Framer's API gives on reads. */
export const BranchAccessSchema = z.enum(["available", "unavailable", "unknown"]);

/** What a read-only check of the project finds out about its Framer plan. */
export const CapabilityProbeSchema = z.object({
  branches: BranchAccessSchema,
  /** Why branch access is unknown, as a sentence; null when it is known. */
  detail: z.string().nullable(),
});

/** A call Framer refused because the project's plan does not include the feature. */
export const PlanLimitSchema = z.object({
  tool: z.string(),
  message: z.string(),
  at: z.string(),
});

/**
 * What the project's Framer plan allows, as far as the API tells: branch access (Pro and Enterprise have it) and
 * every plan limit a call has run into. Framer's API does not report the plan itself.
 */
export const CapabilitiesSchema = z.object({
  branches: BranchAccessSchema,
  limits: z.array(PlanLimitSchema),
  /** Some features of higher plans are missing: warn the user before relying on them. */
  limited: z.boolean(),
  summary: z.string(),
});
