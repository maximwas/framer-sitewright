import { SNAPSHOT_DEPTH } from "../constants/history.ts";
import {
  BREAKPOINT_PLACEMENT_ATTRIBUTES,
  PLUGIN_CREATABLE_TYPES,
  PLUGIN_DEFAULT_VALUES,
} from "../constants/plugin-nodes.ts";
import { PIXEL_WIDTH } from "../constants/text-styles.ts";
import { labelOf } from "../history/activity.ts";
import { applyAliases } from "../history/aliases.ts";
import type { FramerRuntime } from "../types/framer.ts";
import type {
  DslAttributeMap,
  NodeSnapshot,
  NodeStep,
  RevertOptions,
  RevertOutcome,
  RevertResult,
} from "../types/history.ts";
import type { PluginNodeRecord, StyleLookup } from "../types/plugin-nodes.ts";
import { errorMessage } from "../utils/errors.ts";
import { fromPluginNode, toPluginAttributes } from "./attributes.ts";
import { addBreakpoint, deletionSnapshot } from "./breakpoints.ts";
import { withFills } from "./fills.ts";
import { dslValueOf, layoutOf, nodeRecord, setTextOf, textOf } from "./node-record.ts";
import { readPluginTree } from "./read.ts";

/**
 * Reverts node steps through the Plugin API, without framer.agent: created nodes are removed, changed attributes and
 * text set back, deleted frames and texts recreated with new ids (in `remap`), moved nodes put back. A node someone
 * changed since is a conflict unless `force`. The revert records its own steps, so it can be redone. Steps with
 * attributes only the DSL has (from a session with a Server API key) are conflicts with a note.
 */
export class PluginNodeRevert {
  readonly #runtime: FramerRuntime;
  readonly #options: RevertOptions;
  readonly #remap: Map<string, string>;
  #styles: StyleLookup | null = null;

  constructor(runtime: FramerRuntime, options: RevertOptions, remap: Map<string, string>) {
    this.#runtime = runtime;
    this.#options = options;
    this.#remap = remap;
  }

  /** Steps newest first. */
  async revert(steps: readonly NodeStep[]): Promise<RevertResult[]> {
    const results: RevertResult[] = [];

    for (const original of steps) {
      const step = (applyAliases([original], this.#remap)[0] ?? original) as NodeStep;
      const { outcome, note } = await this.#revertStep(step);

      results.push({
        kind: "node",
        id: original.id,
        path: labelOf(original),
        outcome,
        newId: this.#remap.get(original.id) ?? null,
        note,
      });
    }

    return results;
  }

  async #revertStep(step: NodeStep): Promise<{ outcome: RevertOutcome; note: string | null }> {
    if (step.after === null) {
      return this.#recreate(step);
    }

    const node = nodeRecord(await this.#port.getNode(step.id));

    if (node === null) {
      return outcome("gone");
    }

    const current = await this.#currentValues(step.id, node, step.after.attributes);
    const untouched = sameValues(current, step.after.attributes);

    if (step.before === null) {
      return untouched || this.#options.force ? this.#remove(step) : outcome("conflict");
    }

    if (step.change === "moved") {
      return this.#move(step, step.before.parentId, step.before.index);
    }

    if (sameValues(current, step.before.attributes)) {
      return outcome("unchanged");
    }

    return untouched || this.#options.force ? this.#restore(step, node, current) : outcome("conflict");
  }

  /** Removes a node the step created; its subtree is kept in the revert's own step, so redo recreates it. */
  async #remove(step: NodeStep): Promise<{ outcome: RevertOutcome; note: string | null }> {
    if (!this.#options.dryRun) {
      const tree = await readPluginTree(this.#port, step.id, SNAPSHOT_DEPTH);
      const deletion =
        tree === null ? null : await deletionSnapshot(this.#port, tree, tree.$parentId ?? "", step.after?.index ?? 0);

      await this.#port.removeNodes([step.id]);

      if (tree !== null && deletion !== null) {
        this.#options.history?.record({
          ...step,
          change: "deleted",
          before: {
            parentId: step.after?.parentId ?? tree.$parentId ?? null,
            index: step.after?.index ?? null,
            attributes: step.after?.attributes ?? {},
            nodes: deletion.nodes,
            overrides: deletion.overrides,
          },
          after: null,
        });
      }
    }

    return outcome("deleted");
  }

  /** Sets the attributes and text a step changed back to what they were. */
  async #restore(
    step: NodeStep,
    node: PluginNodeRecord,
    current: DslAttributeMap,
  ): Promise<{ outcome: RevertOutcome; note: string | null }> {
    const before = step.before?.attributes ?? {};
    const { text, ...attributes } = before;
    const converted = toPluginAttributes(step.type, stringify(attributes), await this.#lookup());

    if (converted.unsupported.length > 0 || converted.invalid.length > 0) {
      return outcome(
        "conflict",
        `Needs a Server API key: ${[...converted.unsupported, ...converted.invalid].join(", ")}.`,
      );
    }

    if (!this.#options.dryRun) {
      if (Object.keys(converted.attributes).length > 0) {
        await this.#port.setAttributes(step.id, await this.#fills(converted.attributes));
      }

      if (typeof text === "string") {
        await setTextOf(node, text);
      }

      this.#options.history?.record({
        ...step,
        change: "updated",
        before: {
          ...state(step),
          attributes: current,
        },
        after: {
          ...state(step),
          attributes: before,
        },
      });
    }

    return outcome("restored");
  }

  /** Recreates a deleted subtree from its snapshot, parents first; frames and texts only. */
  async #recreate(step: NodeStep): Promise<{ outcome: RevertOutcome; note: string | null }> {
    const nodes = step.before?.nodes ?? [];
    const root = nodes[0];

    if (root === undefined) {
      return outcome("conflict", "No snapshot of the deleted node to recreate it from.");
    }

    if (root.replicaOf !== null) {
      return this.#recreateBreakpoint(step, root);
    }

    const skipped = nodes.filter((node) => !PLUGIN_CREATABLE_TYPES.has(node.type));
    const notes: string[] = [];

    if (!PLUGIN_CREATABLE_TYPES.has(root.type)) {
      return outcome("conflict", `A ${root.type} can be recreated only with a Server API key.`);
    }

    if (skipped.length > 0) {
      notes.push(
        `${skipped.length} node(s) inside (${[...new Set(skipped.map((node) => node.type))].join(", ")}) need a Server API key to come back.`,
      );
    }

    if (!this.#options.dryRun) {
      const parentId = step.before?.parentId ?? root.parentId;

      for (const node of nodes) {
        if (!PLUGIN_CREATABLE_TYPES.has(node.type) || (node !== root && !this.#remap.has(node.parentId))) {
          continue;
        }

        await this.#create(
          node,
          node === root ? parentId : (this.#remap.get(node.parentId) ?? node.parentId),
          step.pagePath,
        );
      }

      const newRoot = this.#remap.get(root.id);

      if (newRoot !== undefined && step.before?.index !== null && step.before?.index !== undefined) {
        await this.#port.setParent(newRoot, parentId, step.before.index);
      }

      // The other breakpoints' overrides for these nodes went with them: their copies get them back.
      const copies = Object.entries(step.before?.overrides ?? {}).flatMap(([breakpoint, byNode]) =>
        Object.entries(byNode).map(
          ([nodeId, attributes]) => [`${breakpoint}${this.#remap.get(nodeId) ?? nodeId}`, attributes] as const,
        ),
      );
      const lost = await this.#override(copies);

      if (lost.length > 0) {
        notes.push(`Overrides that need a Server API key did not come back: ${lost.join(", ")}.`);
      }
    }

    return outcome("recreated", notes.length === 0 ? null : notes.join(" "));
  }

  /**
   * Brings a deleted breakpoint back: Framer copies the primary breakpoint again, then the breakpoint's own values and
   * its layers' overrides are set on the new copies.
   */
  async #recreateBreakpoint(
    step: NodeStep,
    root: NodeSnapshot,
  ): Promise<{ outcome: RevertOutcome; note: string | null }> {
    const width = PIXEL_WIDTH.exec(String(root.attributes.width ?? ""));
    const parentId = step.before?.parentId ?? root.parentId;

    if (width === null || root.replicaOf === null) {
      return outcome("conflict", "The snapshot does not say the breakpoint's width.");
    }

    if (this.#options.dryRun) {
      return outcome("recreated");
    }

    let id: string;

    try {
      id = await addBreakpoint(this.#port, parentId, this.#remap.get(root.replicaOf) ?? root.replicaOf, {
        name: root.name ?? "Breakpoint",
        width: Number(width[1]),
      });
    } catch (error) {
      // A component's variant, for one: the Plugin API adds breakpoints to web pages only.
      return outcome("conflict", `${errorMessage(error)} It needs a Server API key to come back.`);
    }

    this.#remap.set(root.id, id);
    this.#options.history?.recordRemap(root.id, id);
    this.#options.history?.record({
      kind: "node",
      id,
      type: root.type,
      name: root.name,
      pagePath: step.pagePath,
      change: "created",
      before: null,
      after: {
        parentId,
        index: null,
        attributes: { width: `${width[1]}px` },
        nodes: [],
        overrides: {},
      },
    });

    const overrides = step.before?.overrides ?? {};
    const layers = overrides[root.id] ?? Object.values(overrides)[0] ?? {};
    const own = Object.fromEntries(
      Object.entries(root.attributes).filter(([name]) => !BREAKPOINT_PLACEMENT_ATTRIBUTES.has(name)),
    );
    const lost = await this.#override([
      [id, own],
      ...Object.entries(layers).map(([originalId, attributes]) => [`${id}${originalId}`, attributes] as const),
    ]);

    return outcome(
      "recreated",
      lost.length === 0 ? null : `Overrides that need a Server API key did not come back: ${lost.join(", ")}.`,
    );
  }

  /** Sets attributes on breakpoint copies by id; what the Plugin API cannot set (or a copy that is gone) comes back. */
  async #override(targets: readonly (readonly [string, DslAttributeMap])[]): Promise<string[]> {
    const lost: string[] = [];

    for (const [id, attributes] of targets) {
      if (Object.keys(attributes).length === 0) {
        continue;
      }

      const node = nodeRecord(await this.#port.getNode(id));

      if (node === null) {
        lost.push(id);
        continue;
      }

      const { text, ...rest } = attributes;
      const converted = toPluginAttributes(fromPluginNode(node, null).type, stringify(rest), await this.#lookup());

      lost.push(...converted.unsupported, ...converted.invalid);

      if (Object.keys(converted.attributes).length > 0) {
        await this.#port.setAttributes(id, await this.#fills(converted.attributes));
      }

      if (typeof text === "string") {
        await setTextOf(node, text);
      }
    }

    return lost;
  }

  async #create(snapshot: NodeSnapshot, parentId: string, pagePath: string): Promise<void> {
    const { text, ...attributes } = snapshot.attributes;
    const converted = toPluginAttributes(snapshot.type, stringify(attributes), await this.#lookup());
    const named =
      snapshot.name === null
        ? converted.attributes
        : {
            ...converted.attributes,
            name: snapshot.name,
          };
    const created = nodeRecord(
      snapshot.type === "FrameNode"
        ? await this.#port.createFrameNode(
            {
              backgroundColor: null,
              ...(await this.#fills(named)),
            },
            parentId,
          )
        : await this.#port.createTextNode?.(named, parentId),
    );

    if (created === null) {
      return;
    }

    if (typeof text === "string") {
      await setTextOf(created, text);
    }

    const id = String(created.id);

    this.#remap.set(snapshot.id, id);
    this.#options.history?.recordRemap(snapshot.id, id);
    this.#options.history?.record({
      kind: "node",
      id,
      type: snapshot.type,
      name: snapshot.name,
      pagePath,
      change: "created",
      before: null,
      after: {
        parentId,
        index: snapshot.index,
        attributes: snapshot.attributes,
        nodes: [],
        overrides: {},
      },
    });
  }

  async #move(
    step: NodeStep,
    parentId: string | null,
    index: number | null,
  ): Promise<{ outcome: RevertOutcome; note: string | null }> {
    if (parentId === null) {
      return outcome("conflict", "The step does not say where the node was.");
    }

    if (!this.#options.dryRun) {
      await this.#port.setParent(step.id, this.#remap.get(parentId) ?? parentId, index ?? undefined);
    }

    return outcome("restored");
  }

  /** The node's DSL values for the attributes a step names; text by its plain text. */
  async #currentValues(id: string, node: PluginNodeRecord, names: DslAttributeMap): Promise<DslAttributeMap> {
    const parent = nodeRecord(await this.#port.getParent(id));
    const { attributes } = fromPluginNode(node, layoutOf(parent));
    const values: DslAttributeMap = {};

    for (const name of Object.keys(names)) {
      values[name] =
        name === "text"
          ? await textOf(node)
          : (dslValueOf(node, attributes, name) ?? PLUGIN_DEFAULT_VALUES[name] ?? null);
    }

    return values;
  }

  /** Image and gradient fills as the Plugin API sets them (withFills). */
  #fills(attributes: Record<string, unknown>): Promise<Record<string, unknown>> {
    return withFills(attributes, this.#port, this.#runtime.createGradient);
  }

  async #lookup(): Promise<StyleLookup> {
    this.#styles ??= {
      colors: await this.#port.getColorStyles(),
      texts: await this.#port.getTextStyles(),
    };

    return this.#styles;
  }

  get #port() {
    return this.#runtime.port;
  }
}

function outcome(result: RevertOutcome, note: string | null = null): { outcome: RevertOutcome; note: string | null } {
  return {
    outcome: result,
    note,
  };
}

/** Whether a node has the values a step expects; a value the step left unset counts as unset now too. */
function sameValues(current: DslAttributeMap, expected: DslAttributeMap): boolean {
  return Object.entries(expected).every(([name, value]) => text(current[name]) === text(value));
}

function text(value: DslAttributeMap[string] | undefined): string | null {
  return value === null || value === undefined || value === "null" ? null : String(value);
}

function stringify(attributes: DslAttributeMap): Record<string, string> {
  return Object.fromEntries(Object.entries(attributes).map(([name, value]) => [name, text(value) ?? "null"]));
}

function state(step: NodeStep) {
  return {
    parentId: step.after?.parentId ?? step.before?.parentId ?? null,
    index: null,
    attributes: {},
    nodes: [],
    overrides: {},
  };
}
