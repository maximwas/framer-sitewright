import type * as z from "zod";
import { deleteNode, joinCommands } from "../dsl/commands.ts";
import { normalizeDslResult } from "../dsl/result.ts";
import { requireAgent } from "../framer/runtime.ts";
import { parseSerializedNode } from "../history/dsl/serialized.ts";
import type { StyleDeleteOutputSchema } from "../schemas/styles.ts";
import type { DslResult } from "../types/dsl.ts";
import type { AgentPort, FramerRuntime } from "../types/framer.ts";
import type { PluginApiWrite, RemovableStyle, StyleDeletion, StyleSelection } from "../types/styles.ts";
import { normalizeAssetPath } from "./asset-path.ts";
import { runPluginApiWrites } from "./plugin-api-batch.ts";

/** Deletes the styles selectStyles found; unknown paths and folders go to `notFound`. */
export async function deleteStyles<S extends RemovableStyle>(
  runtime: FramerRuntime,
  deletion: StyleDeletion<S>,
): Promise<z.input<typeof StyleDeleteOutputSchema>> {
  const { found } = deletion;
  const notFound = [...deletion.notFound];
  const deleted = found.map(({ path, style }) => ({
    path,
    id: style.id,
  }));
  const { via } = deletion;

  if (found.length === 0) {
    return {
      deleted,
      failed: [],
      notFound,
      via,
      diagnostics: null,
    };
  }

  if (via === "plugin-api") {
    const writes = found.map(
      ({ path, style }): PluginApiWrite => ({
        action: "delete",
        path,
        run: async () => {
          await deletion.beforeRemove?.(style);
          await style.remove();
        },
      }),
    );

    await runPluginApiWrites(writes, deletion.listTool);

    return {
      deleted,
      failed: [],
      notFound,
      via,
      diagnostics: null,
    };
  }

  const agent = requireAgent(runtime);
  const dsl = joinCommands(found.map(({ style }) => deleteNode(style.id)));
  const result = normalizeDslResult(await agent.applyChanges(dsl));
  const refused = refusals(result, deleted);
  const removed = deleted.filter(({ id }) => !refused.has(id)).map(({ id }) => id);
  const diagnostics =
    deletion.slotNodeType === undefined
      ? result
      : withSlotErrors(result, await deleteLeftoverSlots(agent, deletion.slotNodeType, removed));

  return {
    deleted: deleted.filter(({ id }) => !refused.has(id)),
    failed: deleted.flatMap((style) => {
      const reason = refused.get(style.id);

      return reason === undefined
        ? []
        : [
            {
              ...style,
              reason,
            },
          ];
    }),
    notFound,
    via,
    diagnostics,
  };
}

/**
 * Framer bug (01.10.2026): DSL DEL of a text style removes only the style itself, and the nodes of its breakpoint slots
 * stay behind as presets nobody sees but the DSL. They name the style as `$originalId`, so they are deleted next, once
 * the style is surely gone; a refused style keeps its slots. Returns that DEL's outcome, or null when none were left.
 */
async function deleteLeftoverSlots(
  agent: AgentPort,
  slotNodeType: string,
  removedIds: readonly string[],
): Promise<DslResult | null> {
  if (removedIds.length === 0) {
    return null;
  }

  const listed = await agent.getNodesOfTypes({ types: [slotNodeType] });
  const nodes = (Array.isArray(listed) ? listed : Object.values(listed ?? {})).flatMap((value) => {
    const node = parseSerializedNode(value);

    return node === null ? [] : [node];
  });
  const slots = nodes.filter((node) => node.$originalId !== undefined && removedIds.includes(node.$originalId));

  return slots.length === 0
    ? null
    : normalizeDslResult(await agent.applyChanges(joinCommands(slots.map((slot) => deleteNode(slot.id)))));
}

/** The delete's diagnostics with whatever went wrong removing the leftover slots. */
function withSlotErrors(result: DslResult, slots: DslResult | null): DslResult {
  return slots === null || slots.ok
    ? result
    : {
        ...result,
        ok: false,
        errors: [...result.errors, ...slots.errors],
      };
}

/** Why Framer refused each style, by id. An error that names no style refused them all. */
function refusals(diagnostics: DslResult, styles: readonly { readonly id: string }[]): Map<string, string> {
  const refused = new Map<string, string>();

  for (const { message, targets } of diagnostics.errors) {
    const ids = targets.length === 0 ? styles.map(({ id }) => id) : targets;

    for (const id of ids) {
      refused.set(id, message);
    }
  }

  return refused;
}

/**
 * The styles a delete takes: every style at one of `paths` (two styles may share a path) and every style inside one
 * of `folders`, each once. A folder is just the start of style paths, so deleting what is inside removes the folder.
 */
export function selectStyles<S extends RemovableStyle & { readonly path: string }>(
  styles: readonly S[],
  paths: readonly string[],
  folders: readonly string[],
): StyleSelection<S> {
  const wantedPaths = new Set(paths.map(normalizeAssetPath));
  const wantedFolders = [...new Set(folders.map(normalizeAssetPath))];
  const found = styles.flatMap((style) => {
    const path = normalizeAssetPath(style.path);
    const matches = wantedPaths.has(path) || wantedFolders.some((folder) => path.startsWith(`${folder}/`));

    return matches
      ? [
          {
            path,
            style,
          },
        ]
      : [];
  });
  const foundPaths = new Set(found.map(({ path }) => path));

  return {
    found,
    notFound: [
      ...[...wantedPaths].filter((path) => !foundPaths.has(path)),
      ...wantedFolders
        .filter((folder) => ![...foundPaths].some((path) => path.startsWith(`${folder}/`)))
        .map((folder) => `${folder}/`),
    ],
  };
}
