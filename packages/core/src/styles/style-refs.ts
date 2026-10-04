import type { StylePlan, StyleRef, StyleWriteOutcome } from "../types/styles.ts";

/** The outcome of a batch that was not sent: created styles have no ids yet. */
export function unsentOutcome(creates: readonly { readonly path: string }[], dsl: string): StyleWriteOutcome {
  return {
    created: creates.map(({ path }) => ({
      path,
      id: null,
    })),
    dsl,
    diagnostics: null,
  };
}

/** The part of the result a plan decides on its own, before anything is written. */
export function describePlan(plan: StylePlan): { updated: StyleRef[]; unchanged: StyleRef[] } {
  return {
    updated: plan.updates.map(({ path, style }) => ({
      path,
      id: style.id,
    })),
    unchanged: [...plan.unchanged],
  };
}
