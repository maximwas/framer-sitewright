import { LINK_STYLE_NODE_TYPE } from "../constants/link-styles.ts";
import { addNode, deleteNode, setNode } from "../dsl/commands.ts";
import { normalizeDslResult } from "../dsl/result.ts";
import { nextTempId } from "../dsl/temp-ids.ts";
import { requireAgent } from "../framer/runtime.ts";
import { readLinkStyles } from "../styles/link-styles.ts";
import type { DslAttributes, DslResult } from "../types/dsl.ts";
import type { FramerRuntime } from "../types/framer.ts";
import type { LinkEntry, LinkStep, LinkStyleState, RevertOptions, RevertOutcome } from "../types/history.ts";
import { decide } from "./revert-decision.ts";
import { linkStyleState } from "./style-states.ts";

interface LinkRevertOutcome {
  readonly outcome: RevertOutcome;
  readonly note: string | null;
}

/**
 * Undoes link style steps through the DSL, where alone link styles exist: deletes a style the AI made, writes back one
 * it changed, recreates one it deleted. What Framer refuses (a style text still uses cannot be deleted) stays as it is
 * and comes back as a conflict with Framer's reason. `remap` is shared with the rest of the revert.
 */
export class LinkStyleRevert {
  readonly #runtime: FramerRuntime;
  readonly #options: RevertOptions;
  readonly #remap: Map<string, string>;
  #entries: LinkEntry[] | null = null;

  constructor(runtime: FramerRuntime, options: RevertOptions, remap: Map<string, string>) {
    this.#runtime = runtime;
    this.#options = options;
    this.#remap = remap;
  }

  async revert(step: LinkStep): Promise<LinkRevertOutcome> {
    const entries = await this.#current();
    const decision = decide(step, entries, this.#options.force);
    const before = step.before;

    if (decision.outcome === "deleted") {
      const { target } = decision;

      return this.#write(decision.outcome, deleteNode(target.id), () => {
        entries.splice(entries.indexOf(target), 1);
      });
    }

    if (decision.outcome === "restored" && before !== null) {
      const { target } = decision;

      return this.#write(decision.outcome, setNode(target.id, restoring(target.state, before)), () => {
        target.state = before;
        target.path = before.path;
      });
    }

    if (decision.outcome === "recreated" && before !== null) {
      const tempId = nextTempId(this.#runtime, "undo");
      const command = addNode(LINK_STYLE_NODE_TYPE, tempId, {
        name: before.path,
        ...before.attributes,
      });

      return this.#write(decision.outcome, command, (result) => {
        const id = result?.renamedIds[tempId] ?? `dry-run:${step.id}`;

        this.#remap.set(step.id, id);

        if (result !== null) {
          this.#options.history?.recordRemap(step.id, id);
        }

        entries.push({
          id,
          path: before.path,
          state: before,
          handle: null,
        });
      });
    }

    return {
      outcome: decision.outcome,
      note: null,
    };
  }

  /** Sends one command, unless it is a dry run; `applied` tracks the change, and gets null on a dry run. */
  async #write(
    outcome: RevertOutcome,
    command: string,
    applied: (result: DslResult | null) => void,
  ): Promise<LinkRevertOutcome> {
    if (this.#options.dryRun) {
      applied(null);

      return {
        outcome,
        note: null,
      };
    }

    const result = normalizeDslResult(await requireAgent(this.#runtime).applyChanges(command));

    if (result.errors.length > 0) {
      return {
        outcome: "conflict",
        note: `Framer refused it: ${result.errors.map(({ message }) => message).join(" ")}`,
      };
    }

    applied(result);

    return {
      outcome,
      note: null,
    };
  }

  /** The link styles as Framer has them now, read once per revert. */
  async #current(): Promise<LinkEntry[]> {
    this.#entries ??= (await readLinkStyles(this.#runtime)).map((style) => {
      const state = linkStyleState(style);

      return {
        id: style.id,
        path: state.path,
        state,
        handle: null,
      };
    });

    return this.#entries;
  }
}

/** A SET that brings a style from `now` back to `before`: its name, its values, and null for what it did not have. */
function restoring(now: LinkStyleState, before: LinkStyleState): DslAttributes {
  const removed = Object.keys(now.attributes).filter((key) => !(key in before.attributes));

  return {
    ...(now.path === before.path ? {} : { name: before.path }),
    ...Object.fromEntries(removed.map((key) => [key, null])),
    ...before.attributes,
  };
}
