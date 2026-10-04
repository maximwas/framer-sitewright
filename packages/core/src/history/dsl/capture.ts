import { FRAMER_NODE_ID } from "../../constants/dsl.ts";
import { TEXT_CONTENT_TYPES, VIRTUAL_TEXT_ID } from "../../constants/history.ts";
import type { DslCommand } from "../../types/dsl.ts";
import type { CaptureTarget, DslCapture } from "../../types/history.ts";

/**
 * What a DSL batch touches, in command order, so the nodes can be read before and after it: nodes it creates (by temp
 * id), existing nodes it sets, moves or deletes. Commands on nodes the batch itself creates need nothing: undo deletes
 * those nodes whole. Verbs the grammar does not have are listed, since their effect cannot be undone.
 */
export function planCapture(commands: readonly DslCommand[]): DslCapture {
  const targets: CaptureTarget[] = [];
  const created = new Set<string>();
  const unsupported: string[] = [];
  const createdHere = (id: string) => [...created].some((tempId) => isOrExtends(id, tempId, created));
  const add = (target: CaptureTarget) => {
    const known = targets.find((existing) => existing.change === target.change && existing.id === target.id);

    if (known === undefined) {
      targets.push(target);
    } else if (target.change === "updated" && known.change === "updated" && target.text) {
      targets[targets.indexOf(known)] = target;
    }
  };

  const textOwners = new Map<string, string>();

  for (const command of commands) {
    const owner = textOwner(command, textOwners);
    const newId = newNodeId(command);

    if (owner !== null) {
      // Blocks and runs have positional ids: the change is recorded on the rich text, as its content.
      if (newId !== null) {
        textOwners.set(newId, owner);
      }

      if (!createdHere(owner)) {
        add({
          change: "updated",
          id: owner,
          text: true,
        });
      }
    } else if (newId !== null) {
      created.add(newId);
      add({
        change: "created",
        id: newId,
        type: command.verb === "ADD" ? command.type : null,
      });
    } else if (command.verb === "UNKNOWN") {
      unsupported.push(command.raw);
    } else if (!createdHere(command.id)) {
      add(existingTarget(command));
    }
  }

  return {
    targets,
    unsupported,
  };
}

/**
 * Whether `id` is the temp id itself, or a compound id inside a variant the batch created (`<temp id><node id>`).
 * The tail must look like an id, so a real id that happens to start with a short temp id does not count.
 */
function isOrExtends(id: string, tempId: string, created: ReadonlySet<string>): boolean {
  if (id === tempId) {
    return true;
  }

  const tail = id.startsWith(tempId) ? id.slice(tempId.length) : "";

  return FRAMER_NODE_ID.test(tail) || created.has(tail);
}

/**
 * The rich text whose content a command changes: an ADD of a text block or run (under a rich text, a virtual block,
 * or a block this batch adds), or a command on a virtual id. Null for anything else.
 */
function textOwner(command: DslCommand, owners: ReadonlyMap<string, string>): string | null {
  if (command.verb === "ADD" && command.type !== null && TEXT_CONTENT_TYPES.has(command.type)) {
    const parent = command.attributes.parent ?? "";

    return owners.get(parent) ?? VIRTUAL_TEXT_ID.exec(parent)?.[1] ?? parent;
  }

  return VIRTUAL_TEXT_ID.exec(command.id)?.[1] ?? null;
}

/** The temp id of the node a command creates, or null. */
function newNodeId(command: DslCommand): string | null {
  switch (command.verb) {
    case "ADD":
    case "CREATE_VARIANT":
      return command.id;
    case "DUPE":
      return command.attributes.newId ?? null;
    default:
      return null;
  }
}

function existingTarget(command: DslCommand): CaptureTarget {
  switch (command.verb) {
    case "MOVE":
      return {
        change: "moved",
        id: command.id,
      };
    case "DEL":
      return {
        change: "deleted",
        id: command.id,
      };
    default:
      return {
        change: "updated",
        id: command.id,
        text: Object.keys(command.attributes).some((key) => key === "text" || key.startsWith("text.")),
      };
  }
}
