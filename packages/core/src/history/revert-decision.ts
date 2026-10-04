import type { Decision, StepStates, WorkingEntry } from "../types/history.ts";
import { sameState } from "./style-states.ts";

/** Decides one step against the current items. With `force`, a conflict is overwritten instead of skipped. */
export function decide<State extends { readonly path: string }, Entry extends WorkingEntry<State, unknown>>(
  step: StepStates<State>,
  entries: readonly Entry[],
  force: boolean,
): Decision<Entry> {
  if (step.after === null) {
    // The AI deleted it: recreate it, unless another item has taken its path since.
    const occupant = entries.find((entry) => entry.path === step.before?.path);

    if (occupant === undefined) {
      return { outcome: "recreated" };
    }

    return force
      ? {
          outcome: "restored",
          target: occupant,
        }
      : { outcome: "conflict" };
  }

  const now = entries.find((entry) => entry.id === step.id);

  if (now === undefined) {
    return { outcome: "gone" };
  }

  const untouched = sameState(now.state, step.after);

  if (step.before === null) {
    return untouched || force
      ? {
          outcome: "deleted",
          target: now,
        }
      : { outcome: "conflict" };
  }

  if (sameState(now.state, step.before)) {
    return { outcome: "unchanged" };
  }

  return untouched || force
    ? {
        outcome: "restored",
        target: now,
      }
    : { outcome: "conflict" };
}
