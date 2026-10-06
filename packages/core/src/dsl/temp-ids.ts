import type { FramerRuntime } from "../types/framer.ts";
import { joinCommands } from "./commands.ts";
import { parseDslCommand, splitDslCommands } from "./parse.ts";

const sequences = new WeakMap<FramerRuntime, number>();

/**
 * Framer maps DSL temp ids per session and never accepts a temp id twice, even after the node is
 * deleted ("The requested id already exists"). Every generated temp id is therefore unique for the
 * runtime's lifetime, and carries the transport's salt (FramerRuntime.tempIdSalt).
 */
export function nextTempId(runtime: FramerRuntime, base: string): string {
  const sequence = sequences.get(runtime) ?? 0;

  sequences.set(runtime, sequence + 1);

  return `${base}${runtime.tempIdSalt ?? ""}${sequence}`;
}

/**
 * Raw DSL with the temp ids it creates (`+Type <id>`, `CREATE_VARIANT <id>`, `DUPE … newId`) renamed to ones of its
 * own, and every use of them in the batch with them. Every agent on a project shares one Server API session, where a
 * temp id stays bound to its node: another agent's `q2` from an earlier batch would answer `SET q2`. `created` maps
 * each id the batch wrote to the one sent, so the answer can use the agent's names.
 */
export function isolateTempIds(
  dsl: string,
  makeId: (base: string) => string,
): { dsl: string; created: Record<string, string> } {
  const commands = splitDslCommands(dsl).map((raw) => ({
    raw,
    command: parseDslCommand(raw),
  }));
  const created: Record<string, string> = {};

  for (const { command } of commands) {
    const ids = [
      ...(command.verb === "ADD" || command.verb === "CREATE_VARIANT" ? [command.id] : []),
      ...(command.verb === "DUPE" && command.attributes.newId !== undefined ? [command.attributes.newId] : []),
    ];

    for (const id of ids) {
      created[id] ??= makeId(id);
    }
  }

  if (Object.keys(created).length === 0) {
    return {
      dsl,
      created,
    };
  }

  const renamed = commands.map(({ raw, command }) => {
    const head = created[command.id] ?? compoundOf(command.id, created);
    const withHead = head === undefined ? raw : raw.replace(/^(\S+\s+)\S+/, `$1${head}`);

    return Object.entries(command.attributes).reduce((text, [key, value]) => {
      const next = renameValue(value, created);

      return next === value ? text : text.replace(`${key}="${value}"`, `${key}="${next}"`);
    }, withHead);
  });

  return {
    dsl: joinCommands(renamed.map((command) => `${command};`)),
    created,
  };
}

/**
 * A compound id (a breakpoint's or variant's id followed by a node's) made of two temp ids the batch creates, renamed
 * part by part; undefined for anything else.
 */
function compoundOf(id: string, created: Readonly<Record<string, string>>): string | undefined {
  for (const [own, sent] of Object.entries(created)) {
    const rest = id.startsWith(own) ? created[id.slice(own.length)] : undefined;

    if (rest !== undefined) {
      return `${sent}${rest}`;
    }
  }

  return undefined;
}

/** A value that is a created temp id, or holds one as var(--variable-<id>), with the id renamed. */
function renameValue(value: string, created: Readonly<Record<string, string>>): string {
  const own = created[value] ?? compoundOf(value, created);

  if (own !== undefined) {
    return own;
  }

  return value.replace(/var\(--variable-([^)]+)\)/g, (match, id: string) => {
    const renamed = created[id];

    return renamed === undefined ? match : `var(--variable-${renamed})`;
  });
}
