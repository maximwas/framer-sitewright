import type * as z from "zod";
import type {
  BranchAccessSchema,
  CapabilitiesSchema,
  CapabilityProbeSchema,
  PlanLimitSchema,
} from "../schemas/capabilities.ts";

export type BranchAccess = z.infer<typeof BranchAccessSchema>;

export type CapabilityProbe = z.infer<typeof CapabilityProbeSchema>;

export type PlanLimit = z.infer<typeof PlanLimitSchema>;

export type Capabilities = z.infer<typeof CapabilitiesSchema>;
