import {
  CRITICAL_SETTLE_RADIANS,
  PHYSICS_TRANSITIONS,
  SPRING_DURATION,
  SPRING_DURATION_STEP_S,
  SPRING_PHYSICS,
  SPRING_REST,
  TRANSITION_ATTRIBUTE,
} from "../constants/dsl.ts";
import type { DslIssue, SpringConversion } from "../types/dsl.ts";
import { joinCommands } from "./commands.ts";
import { parseDslCommand, splitDslCommands } from "./parse.ts";

/**
 * Each transition as the spring Framer keeps there. Framer stores only time springs on most transitions and drops a
 * spring-physics written there for its own bouncy default, and keeps only physics on scroll transforms and page
 * transitions: a spring of the other kind becomes the nearest spring of the kept kind, without bounce, and is
 * reported so the user can switch it to Physics in the editor.
 */
export function keptSprings(dsl: string): { dsl: string; converted: SpringConversion[] } {
  const converted: SpringConversion[] = [];
  const commands = splitDslCommands(dsl).map((raw) => {
    const command = parseDslCommand(raw);

    return Object.entries(command.attributes).reduce((text, [attribute, value]) => {
      if (!TRANSITION_ATTRIBUTE.test(attribute)) {
        return text;
      }

      // A drag takes only inertia (Framer refuses any spring there); the rest keep one kind of spring.
      const kept = attribute.startsWith("dragEffect.")
        ? asInertia(value)
        : PHYSICS_TRANSITIONS.test(attribute)
          ? asPhysics(value)
          : asDuration(value);

      if (kept === null) {
        return text;
      }

      converted.push({
        target: command.id,
        attribute,
        from: value,
        to: kept,
      });

      return text.replace(`${attribute}="${value}"`, `${attribute}="${kept}"`);
    }, raw);
  });

  return {
    dsl: converted.length === 0 ? dsl : joinCommands(commands.map((command) => `${command};`)),
    converted,
  };
}

/** How long a spring from rest takes to stay within SPRING_REST of its target, by a millisecond simulation. */
export function settleSeconds(stiffness: number, damping: number, mass: number): number {
  const step = 0.001;
  let position = 0;
  let velocity = 0;
  let settled = 0;

  for (let time = step; time <= 10; time += step) {
    velocity += ((-stiffness * (position - 1) - damping * velocity) / mass) * step;
    position += velocity * step;

    if (Math.abs(position - 1) > SPRING_REST) {
      settled = time;
    }
  }

  return settled;
}

/** A spring-physics as the time spring without bounce that settles when it does; null for anything else. */
function asDuration(value: string): string | null {
  const physics = SPRING_PHYSICS.exec(value);

  if (physics === null) {
    return null;
  }

  const [, stiffness = "0", damping = "0", mass = "1", delay = "0"] = physics;
  const seconds = settleSeconds(Number(stiffness), Number(damping), Number(mass));
  const rounded = Math.max(
    SPRING_DURATION_STEP_S,
    Math.round(seconds / SPRING_DURATION_STEP_S) * SPRING_DURATION_STEP_S,
  );

  return `spring-duration ${Number(rounded.toFixed(2))}s 0 ${Number(delay)}s`;
}

/** A spring-physics as the inertia a drag takes: the same stiffness and damping, no overshoot when critically damped. */
function asInertia(value: string): string | null {
  const physics = SPRING_PHYSICS.exec(value);

  return physics === null ? null : `inertia ${physics[1]} ${physics[2]}`;
}

/** A spring-duration as the critically damped physics spring of that duration (mass 1); null for anything else. */
function asPhysics(value: string): string | null {
  const duration = SPRING_DURATION.exec(value);

  if (duration === null) {
    return null;
  }

  const [, seconds = "0.4", , delay = "0"] = duration;
  const frequency = CRITICAL_SETTLE_RADIANS / Math.max(Number(seconds), SPRING_DURATION_STEP_S);

  return `spring-physics ${Math.round(frequency ** 2)} ${Math.round(2 * frequency)} 1 ${Number(delay)}s`;
}

/** What design_apply says about the springs it rewrote: where, from what to what, and where to switch to Physics. */
export function springWarnings(converted: readonly SpringConversion[]): DslIssue[] {
  const toTime = converted.filter(({ to }) => to.startsWith("spring-duration"));
  const toPhysics = converted.filter(({ to }) => to.startsWith("spring-physics"));
  const examples = (list: readonly SpringConversion[]) =>
    [...new Set(list.map(({ from, to }) => `${from} → ${to}`))].slice(0, 3).join("; ");
  const targets = (list: readonly SpringConversion[]) => list.map(({ target, attribute }) => `${target} ${attribute}`);

  return [
    ...(toTime.length === 0
      ? []
      : [
          {
            message: `Framer keeps only time springs on these transitions and would turn spring-physics into its own spring with bounce 0.2, so the nearest time spring without bounce was written (${examples(toTime)}). To have physics there, tell the user to switch these transitions to Physics in the editor.`,
            targets: targets(toTime),
          },
        ]),
    ...(toPhysics.length === 0
      ? []
      : [
          {
            message: `Framer keeps only physics springs on scroll transforms and page transitions, so the physics spring that settles as fast was written (${examples(toPhysics)}).`,
            targets: targets(toPhysics),
          },
        ]),
  ];
}
