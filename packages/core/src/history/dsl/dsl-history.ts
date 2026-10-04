import { VARIABLE_NODE_TYPE } from "../../constants/dsl.ts";
import { SNAPSHOT_DEPTH, TEXT_CONTENT_DEPTH } from "../../constants/history.ts";
import { parseDsl } from "../../dsl/parse.ts";
import type { DslResult, SerializedNode } from "../../types/dsl.ts";
import type { AgentPort } from "../../types/framer.ts";
import type { BeforeSnapshots, CaptureTarget, DslCapture, DslHistoryScope } from "../../types/history.ts";
import { errorMessage } from "../../utils/errors.ts";
import { countOf } from "../../utils/text.ts";
import type { HistoryRecorder } from "../recorder.ts";
import { planCapture } from "./capture.ts";
import { descendantIds, snapshotDeleted, withoutSurvivors } from "./deleted-snapshot.ts";
import { missedChanges, unreadableChanges } from "./missed-changes.ts";
import { readNodes, readPlacements } from "./read-nodes.ts";
import { nodeSteps } from "./steps.ts";

/**
 * Applies a DSL batch and records how to undo it: the nodes it touches are read before and after, and the difference
 * becomes node steps. Like withStyleHistory, the state decides; and recording never fails the batch: a read that
 * fails marks the journal incomplete instead.
 */
export async function withDslHistory(scope: DslHistoryScope, apply: () => Promise<DslResult>): Promise<DslResult> {
  const { history } = scope;
  const commands = parseDsl(scope.dsl);
  const capture = withoutVariables(planCapture(commands), scope.variables ?? new Set(), history);

  if (capture.unsupported.length > 0) {
    history.markIncomplete(`These commands cannot be undone: ${capture.unsupported.join(" ")}`);
  }

  for (const reason of unreadableChanges(commands)) {
    history.markIncomplete(reason);
  }

  const before = await readBefore(scope.agent, scope.pagePath, capture.targets).catch((error: unknown) => {
    history.markIncomplete(`The nodes could not be read before the change: ${errorMessage(error)}`);

    return null;
  });
  let result: DslResult | null = null;

  try {
    result = await apply();

    return result;
  } finally {
    if (before !== null) {
      await recordAfter(scope, capture, before, result);
    }
  }
}

async function readBefore(
  agent: AgentPort,
  pagePath: string,
  targets: readonly CaptureTarget[],
): Promise<BeforeSnapshots> {
  const ids = idsByRead(targets);
  const [moved, plain, text, deleted] = await Promise.all([
    readNodes(agent, pagePath, ids.moved, 0),
    readNodes(agent, pagePath, ids.plain, 0),
    readNodes(agent, pagePath, ids.text, TEXT_CONTENT_DEPTH),
    readNodes(agent, pagePath, ids.deleted, SNAPSHOT_DEPTH),
  ]);
  const placements = await readPlacements(agent, pagePath, [...moved.values(), ...deleted.values()]);
  const snapshots = await Promise.all(
    [...deleted.values()].flatMap((node) => {
      const placement = placements.get(node.id);

      return placement === undefined
        ? []
        : [snapshotDeleted(agent, pagePath, node, placement).then((snapshot) => [node.id, snapshot] as const)];
    }),
  );

  return {
    // The text read is the deepest, so it wins for a node that is also moved or set without text.
    nodes: new Map([...moved, ...plain, ...text]),
    placements,
    deleted: new Map(snapshots),
    unplaced: [...deleted.keys()].filter((id) => !placements.has(id)),
  };
}

/**
 * Never throws: the batch already ran, and its result or error must reach the caller. `result` is null when the DSL
 * call threw. Nodes that outlived a deleted parent (moved out first) are cut from its snapshot, so undo does not
 * recreate a second copy of them.
 */
async function recordAfter(
  scope: DslHistoryScope,
  capture: DslCapture,
  before: BeforeSnapshots,
  result: DslResult | null,
): Promise<void> {
  const { history, agent, pagePath } = scope;
  const renamedIds = result?.renamedIds ?? {};

  try {
    const ids = idsByRead(capture.targets);
    const created = capture.targets.flatMap((target) =>
      target.change === "created" ? [renamedIds[target.id] ?? target.id] : [],
    );
    const [createdNodes, moved, plain, text, deleted, survivors] = await Promise.all([
      readNodes(agent, pagePath, created, 0),
      readNodes(agent, pagePath, ids.moved, 0),
      readNodes(agent, pagePath, ids.plain, 0),
      readNodes(agent, pagePath, ids.text, TEXT_CONTENT_DEPTH),
      readNodes(agent, pagePath, ids.deleted, 0),
      readNodes(agent, pagePath, [...before.deleted.values()].flatMap(descendantIds), 0),
    ]);
    const deletedIds = new Set([...before.deleted.values()].flatMap((snapshot) => snapshot.nodes.map(({ id }) => id)));
    // Framer still reads the descendants of a deleted node, under their old parents (spike 30.09.2026): only a node
    // whose parent is now outside every deleted subtree was moved out before the delete.
    const survivorIds = new Set(
      [...survivors.values()].filter((node) => !deletedIds.has(node.$parentId ?? "")).map(({ id }) => id),
    );
    const snapshots = {
      pagePath,
      targets: capture.targets,
      renamedIds,
      before: {
        ...before,
        deleted: new Map(
          [...before.deleted].map(([id, snapshot]) => [id, withoutSurvivors(snapshot, survivorIds)] as const),
        ),
      },
      after: {
        nodes: new Map<string, SerializedNode>([...createdNodes, ...deleted, ...moved, ...plain, ...text]),
        placements: await readPlacements(agent, pagePath, moved.values()),
      },
    };

    for (const step of nodeSteps(snapshots)) {
      history.record(step);
    }

    for (const reason of missedChanges(snapshots, result === null)) {
      history.markIncomplete(reason);
    }
  } catch (error) {
    history.markIncomplete(`The nodes could not be read after the change: ${errorMessage(error)}`);
  }
}

/**
 * The capture without variables: those the batch creates, sets or deletes are not nodes, so reading them would only
 * report them as unreadable. The journal says plainly that undo leaves them as they are.
 */
function withoutVariables(capture: DslCapture, variables: ReadonlySet<string>, history: HistoryRecorder): DslCapture {
  const isVariable = (target: CaptureTarget) =>
    target.change === "created"
      ? target.type !== null && VARIABLE_NODE_TYPE.test(target.type)
      : variables.has(target.id);
  const changed = [
    ...new Set(
      capture.targets.flatMap((target) => (target.change !== "created" && isVariable(target) ? [target.id] : [])),
    ),
  ];
  const created = capture.targets.filter((target) => target.change === "created" && isVariable(target)).length;

  if (changed.length > 0) {
    history.markIncomplete(`Variables ${changed.join(", ")} changed: undo does not restore variables.`);
  }

  if (created > 0) {
    history.markIncomplete(`${countOf(created, "variable")} created: undo does not remove variables.`);
  }

  return changed.length === 0 && created === 0
    ? capture
    : {
        ...capture,
        targets: capture.targets.filter((target) => !isVariable(target)),
      };
}

/** Which ids each read needs; a node set with text needs its content, so it is read deeper. */
function idsByRead(targets: readonly CaptureTarget[]) {
  const withChange = (change: CaptureTarget["change"]) =>
    targets.filter((target) => target.change === change).map((target) => target.id);
  const text = targets.flatMap((target) => (target.change === "updated" && target.text ? [target.id] : []));

  return {
    moved: withChange("moved"),
    plain: withChange("updated").filter((id) => !text.includes(id)),
    text,
    deleted: withChange("deleted"),
  };
}
