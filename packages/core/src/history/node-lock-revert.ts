import type { FramerRuntime } from "../types/framer.ts";
import type { NodeLockStep, RevertOptions, RevertOutcome } from "../types/history.ts";
import { lockStateOf, nodeLockStep } from "../utils/node-lock.ts";

/**
 * Undoes a layer's lock through the Plugin API, with a key or without: the DSL takes `locked` and ignores it. A lock is
 * yes or no, so the layer is either as the step left it (restored) or as before already (unchanged). The revert
 * records its own step, so redo undoes it.
 */
export class NodeLockRevert {
  readonly #runtime: FramerRuntime;
  readonly #options: RevertOptions;
  /** What a dry run pretends to have set, by layer id: a later step on the same layer sees it. */
  readonly #pretended = new Map<string, boolean>();

  constructor(runtime: FramerRuntime, options: RevertOptions) {
    this.#runtime = runtime;
    this.#options = options;
  }

  async revert(step: NodeLockStep): Promise<RevertOutcome> {
    const now = lockStateOf(await this.#runtime.port.getNode(step.id).catch(() => null));

    if (now === null) {
      return "gone";
    }

    const locked = this.#pretended.get(step.id) ?? now.locked;

    if (locked === step.before.locked) {
      return "unchanged";
    }

    if (this.#options.dryRun) {
      this.#pretended.set(step.id, step.before.locked);
    } else {
      await this.#runtime.port.setAttributes(step.id, { locked: step.before.locked });
      this.#options.history?.record(
        nodeLockStep(step.id, now, {
          ...now,
          locked: step.before.locked,
        }),
      );
    }

    return "restored";
  }
}
