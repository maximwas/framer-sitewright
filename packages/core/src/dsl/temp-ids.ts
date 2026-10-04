import type { FramerRuntime } from "../types/framer.ts";

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
