import { TEXT_CONTENT_DEPTH } from "../../constants/history.ts";
import { formatDslAttributes, joinCommands } from "../../dsl/commands.ts";
import { normalizeDslResult } from "../../dsl/result.ts";
import { nextTempId } from "../../dsl/temp-ids.ts";
import { requireAgent } from "../../framer/runtime.ts";
import type { DslIssue, DslResult, SerializedNode } from "../../types/dsl.ts";
import type { AgentPort, FramerRuntime } from "../../types/framer.ts";
import type {
  CurrentNodes,
  NodeDecision,
  NodeRevertPlan,
  NodeStep,
  PageSteps,
  RevertOptions,
  RevertResult,
} from "../../types/history.ts";
import { applyAliases } from "../aliases.ts";
import { withDslHistory } from "./dsl-history.ts";
import { planNodeRevert } from "./node-revert-plan.ts";
import { readNodes, readPlacements } from "./read-nodes.ts";

/**
 * Reverts node steps through the DSL: one batch per page, plus one for replica overrides of recreated nodes once their
 * real ids are known. Each batch goes through withDslHistory, so the revert is journaled like any DSL change and can
 * be redone. `remap` is shared with the style revert: old id → id of the node recreated for it.
 */
export class NodeRevertRun {
  readonly #runtime: FramerRuntime;
  readonly #options: RevertOptions;
  readonly #remap: Map<string, string>;

  constructor(runtime: FramerRuntime, options: RevertOptions, remap: Map<string, string>) {
    this.#runtime = runtime;
    this.#options = options;
    this.#remap = remap;
  }

  /** Steps newest first. Needs framer.agent: on the plugin transport this throws UNSUPPORTED_TRANSPORT. */
  async revert(steps: readonly NodeStep[]): Promise<RevertResult[]> {
    const agent = requireAgent(this.#runtime);
    const results: RevertResult[] = [];

    for (const group of byPage(steps)) {
      results.push(...(await this.#revertPage(agent, group.pagePath, group.steps)));
    }

    return results;
  }

  async #revertPage(agent: AgentPort, pagePath: string, original: readonly NodeStep[]): Promise<RevertResult[]> {
    const steps = original.map((step) => (applyAliases([step], this.#remap)[0] ?? step) as NodeStep);
    const current = await readCurrent(agent, pagePath, steps);
    const plan = planNodeRevert(steps, current, {
      force: this.#options.force,
      nextTempId: () => nextTempId(this.#runtime, "undo"),
    });
    const issues = this.#options.dryRun ? [] : await this.#apply(agent, pagePath, plan);

    return plan.decisions.map((decision, index) => this.#result(original[index] ?? decision.step, decision, issues));
  }

  async #apply(agent: AgentPort, pagePath: string, plan: NodeRevertPlan): Promise<DslIssue[]> {
    const issues: DslIssue[] = [];

    if (plan.commands.length > 0) {
      const result = await this.#applyDsl(agent, pagePath, plan.commands);

      issues.push(...result.errors);

      for (const [originalId, tempId] of plan.recreated) {
        const id = result.renamedIds[tempId];

        if (id !== undefined) {
          this.#remap.set(originalId, id);
          this.#options.history?.recordRemap(originalId, id);
        }
      }

      const overrides = plan.pendingOverrides.flatMap(({ replicaId, tempId, attributes }) => {
        const id = result.renamedIds[tempId];
        const { text } = formatDslAttributes(attributes);

        return id === undefined || text === "" ? [] : [`SET ${replicaId}${id} ${text};`];
      });

      if (overrides.length > 0) {
        issues.push(...(await this.#applyDsl(agent, pagePath, overrides)).errors);
      }
    }

    if (plan.removePages.length > 0) {
      await this.#runtime.port.removeNodes([...plan.removePages]);
      this.#options.history?.markIncomplete("Removed pages are not journaled, so a redo cannot bring them back.");
    }

    return issues;
  }

  #applyDsl(agent: AgentPort, pagePath: string, commands: readonly string[]): Promise<DslResult> {
    const dsl = joinCommands(commands);
    const apply = async () => normalizeDslResult(await agent.applyChanges(dsl, { pagePath }));
    const history = this.#options.history;

    return history === undefined
      ? apply()
      : withDslHistory(
          {
            history,
            agent,
            pagePath,
            dsl,
          },
          apply,
        );
  }

  #result(original: NodeStep, decision: NodeDecision, issues: readonly DslIssue[]): RevertResult {
    const refused = issues.filter((issue) => issue.targets.some((target) => decision.targets.includes(target)));
    const notes = [decision.note, ...refused.map((issue) => `Framer refused part of it: ${issue.message}`)];
    const newId = this.#remap.get(original.id) ?? null;

    return {
      kind: "node",
      id: original.id,
      path: original.name ?? original.type,
      outcome: decision.outcome,
      newId: this.#options.dryRun && decision.outcome === "recreated" ? `dry-run:${original.id}` : newId,
      note: notes.filter((note) => note !== null).join(" ") || null,
    };
  }
}

/**
 * The nodes the steps name, and their old and new parents, as Framer has them now; rich texts with their content, and
 * where moved nodes sit, so a move back within the same parent is told from one that is already undone.
 */
async function readCurrent(agent: AgentPort, pagePath: string, steps: readonly NodeStep[]): Promise<CurrentNodes> {
  const ids = steps.flatMap((step) => [step.id, step.before?.parentId, step.after?.parentId]);
  const text = steps.flatMap((step) => (step.change === "updated" && changesContent(step) ? [step.id] : []));
  const [plain, deep] = await Promise.all([
    readNodes(
      agent,
      pagePath,
      ids.filter((id): id is string => typeof id === "string"),
      0,
    ),
    readNodes(agent, pagePath, text, TEXT_CONTENT_DEPTH),
  ]);
  const nodes = new Map<string, SerializedNode>([...plain, ...deep]);
  const moved = steps.flatMap((step) => {
    const node = step.change === "moved" ? nodes.get(step.id) : undefined;

    return node === undefined ? [] : [node];
  });

  return {
    nodes,
    placements: await readPlacements(agent, pagePath, moved),
  };
}

function changesContent(step: NodeStep): boolean {
  return (step.before?.nodes.length ?? 0) > 0 || (step.after?.nodes.length ?? 0) > 0;
}

/** Consecutive steps on the same page; order is kept, since steps depend on the ones before them. */
function byPage(steps: readonly NodeStep[]): PageSteps[] {
  const groups: PageSteps[] = [];

  for (const step of steps) {
    const last = groups.at(-1);

    if (last?.pagePath === step.pagePath) {
      last.steps.push(step);
    } else {
      groups.push({
        pagePath: step.pagePath,
        steps: [step],
      });
    }
  }

  return groups;
}
