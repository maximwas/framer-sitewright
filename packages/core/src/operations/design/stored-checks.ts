import { STORED_CHECK_ATTRIBUTES, STORED_CHECK_MAX_NODES, STORED_DEFAULTS } from "../../constants/dsl.ts";
import type { DslCommand, DslIssue } from "../../types/dsl.ts";
import type { AgentPort } from "../../types/framer.ts";
import { sameColor } from "../../utils/color.ts";
import { isPlainObject } from "../../utils/guards.ts";

/** An existing node a batch sets, as read before or after it: whether it is a variant's copy, and its attributes. */
interface TargetState {
  readonly replica: boolean;
  readonly attributes: Readonly<Record<string, string>>;
}

/**
 * The checked attributes each SET of the batch writes on a node that exists already (not one the batch creates), by
 * node id. Null when there are none, or too many nodes to read back.
 */
export function setTargets(commands: readonly DslCommand[]): Map<string, Record<string, string>> | null {
  const created = new Set(commands.filter((command) => command.verb === "ADD").map((command) => command.id));
  const targets = new Map<string, Record<string, string>>();

  for (const command of commands) {
    const written = Object.entries(command.attributes).filter(([key]) => STORED_CHECK_ATTRIBUTES.has(key));

    if (command.verb === "SET" && !created.has(command.id) && written.length > 0) {
      targets.set(command.id, {
        ...targets.get(command.id),
        ...Object.fromEntries(written),
      });
    }
  }

  return targets.size === 0 || targets.size > STORED_CHECK_MAX_NODES ? null : targets;
}

/** The targets as Framer has them now. */
export async function readTargets(
  agent: AgentPort,
  pagePath: string,
  ids: readonly string[],
): Promise<Map<string, TargetState>> {
  const nodes: unknown = await agent.serializeNodes(
    {
      ids,
      depth: 0,
    },
    { pagePath },
  );

  return new Map(
    (Array.isArray(nodes) ? nodes : []).flatMap((node) =>
      isPlainObject(node) && typeof node.id === "string"
        ? [
            [
              node.id,
              {
                replica: "$replicaId" in node || node.$isReplica === true,
                attributes: Object.fromEntries(
                  Object.entries(isPlainObject(node.attributes) ? node.attributes : {}).map(([key, value]) => [
                    key,
                    String(value),
                  ]),
                ),
              },
            ] as const,
          ]
        : [],
    ),
  );
}

/**
 * A variant keeps no override equal to what it inherits: Framer drops the write without an error, and the copy then
 * follows the primary's later changes (seen 12.10.2026: a hover border kept the primary's color after it changed).
 */
export function inheritedOverrideWarnings(
  targets: ReadonlyMap<string, Readonly<Record<string, string>>>,
  before: ReadonlyMap<string, TargetState>,
): DslIssue[] {
  return [...targets].flatMap(([id, written]) => {
    const node = before.get(id);
    const same = node?.replica === true ? equalKeys(written, node.attributes) : [];

    return same.length === 0
      ? []
      : [
          {
            message: `Framer keeps no override on a variant or breakpoint copy equal to what it inherits: ${same.map((key) => `${key}="${written[key]}"`).join(", ")} stays inherited and will follow the primary's later changes. Write it on the primary, or a different value here.`,
            targets: [id],
          },
        ];
  });
}

/** A SET that left a checked value as it was, though it asked for another: Framer dropped it without an error. */
export function unchangedWarnings(
  targets: ReadonlyMap<string, Readonly<Record<string, string>>>,
  before: ReadonlyMap<string, TargetState>,
  after: ReadonlyMap<string, TargetState>,
): DslIssue[] {
  return [...targets].flatMap(([id, written]) => {
    const was = before.get(id);
    const now = after.get(id);

    if (was === undefined || now === undefined) {
      return [];
    }

    const dropped = Object.keys(written).filter(
      (key) =>
        !same(written[key], stored(now, key)) &&
        same(stored(was, key), stored(now, key)) &&
        // A variant's write equal to what it inherits has its own warning.
        !(was.replica && same(written[key], stored(was, key))),
    );

    return dropped.length === 0
      ? []
      : [
          {
            message: `Framer did not store ${dropped.map((key) => `${key}="${written[key]}"`).join(", ")}: it still reads ${dropped.map((key) => `${key}="${stored(now, key) ?? "unset"}"`).join(", ")}. Read the node with nodes_read and write it another way.`,
            targets: [id],
          },
        ];
  });
}

/**
 * Variant changes that jump on the site, which the canvas never shows (seen 12.10.2026): a size animated to 0px snaps,
 * a background blur switches on in one step when its layer's opacity changes, and an appear effect takes over the
 * opacity a variant change would animate.
 */
export function motionWarnings(
  targets: ReadonlyMap<string, Readonly<Record<string, string>>>,
  before: ReadonlyMap<string, TargetState>,
): DslIssue[] {
  return [...targets].flatMap(([id, written]) => {
    const node = before.get(id);

    if (node?.replica !== true) {
      return [];
    }

    const keys = Object.keys(node.attributes);
    const found = [
      ...(["width", "height"].some((key) => written[key] === "0px")
        ? [
            "In a variant change, a size animated to 0px does not ease on the site: the layer snaps. Animate to 1px with overflow clip, or animate scale or position.",
          ]
        : []),
      ...("opacity" in written && keys.some((key) => /^backgroundBlur|^backdropBlur/.test(key))
        ? [
            "In a variant change, background blur does not fade with opacity: it switches on in one step. Move the layer in (position, scale) and keep its opacity at 1.",
          ]
        : []),
      ...("opacity" in written && keys.some((key) => key.startsWith("appearEffect"))
        ? [
            "In a variant change, an appear effect on the layer takes over its opacity, so the change will not animate it. Put the appear effect on a wrapper and change the opacity of the layer inside.",
          ]
        : []),
    ];

    return found.map((message) => ({
      message,
      targets: [id],
    }));
  });
}

function equalKeys(written: Readonly<Record<string, string>>, attributes: Readonly<Record<string, string>>): string[] {
  return Object.keys(written).filter((key) => same(written[key], attributes[key] ?? STORED_DEFAULTS[key]));
}

function stored(node: TargetState, key: string): string | undefined {
  return node.attributes[key] ?? STORED_DEFAULTS[key];
}

function same(a: string | undefined, b: string | undefined): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }

  const loose = (text: string) => text.replace(/\s+/g, "").toLowerCase();

  return loose(a) === loose(b) || safeSameColor(a, b);
}

function safeSameColor(a: string, b: string): boolean {
  try {
    return sameColor(a, b);
  } catch {
    return false;
  }
}
