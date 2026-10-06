import { describe, expect, it } from "vitest";
import { keptSprings, settleSeconds, springWarnings } from "../src/dsl/springs.ts";

describe("springs Framer keeps", () => {
  it("regression: writes the nearest time spring without bounce where Framer drops physics (seen: bounce 0.2, a 0s backdrop)", () => {
    const { dsl, converted } = keptSprings(
      [
        'SET a1 transition="spring-physics 400 40 1 0s";',
        'SET a2 hoverEffect.transition="spring-physics 1000 63 1 0.1s" hoverEffect.scale="1";',
        'SET a3 styleTransformEffect.transition="spring-physics 400 40 1 0s";',
      ].join("\n"),
    );

    expect(dsl).toContain('SET a1 transition="spring-duration 0.45s 0 0s";');
    expect(dsl).toContain('hoverEffect.transition="spring-duration 0.3s 0 0.1s" hoverEffect.scale="1"');
    expect(dsl).toContain('styleTransformEffect.transition="spring-physics 400 40 1 0s"');
    expect(converted.map(({ target, attribute }) => `${target} ${attribute}`)).toEqual([
      "a1 transition",
      "a2 hoverEffect.transition",
    ]);
  });

  it("regression: writes physics where Framer keeps only physics (seen: page transitions ignore spring-duration)", () => {
    const { dsl } = keptSprings('SET bp pageEffects.enter.transition="spring-duration 0.5s 0 0s";');

    expect(dsl).toBe('SET bp pageEffects.enter.transition="spring-physics 341 37 1 0s";');
  });

  it("regression: a drag gets inertia with the spring's stiffness and damping: Framer refuses any spring there", () => {
    expect(keptSprings('SET d dragEffect.transition="spring-physics 400 40 1 0s";').dsl).toBe(
      'SET d dragEffect.transition="inertia 400 40";',
    );
  });

  it("regression: converts an overlay's backdrop too (seen: physics there became spring-duration 0s, no fade)", () => {
    expect(
      keptSprings('SET o backdrop.enter="spring-physics 400 40 1 0s" backdrop.exit="spring-physics 400 40 1 0s";').dsl,
    ).toBe('SET o backdrop.enter="spring-duration 0.45s 0 0s" backdrop.exit="spring-duration 0.45s 0 0s";');
  });

  it("regression: leaves a spring out of a link style's transition, where Framer refuses every spring (seen 06.10.2026)", () => {
    const { dsl, converted } = keptSprings(
      [
        'SET l1 link.transition="spring-physics 400 40 1 0s" link.hover.textColor="rgb(0, 0, 0)";',
        'SET l2 link.transition="spring-duration 0.3s 0 0s";',
        'SET a1 transition="spring-duration 0.3s 0 0s";',
      ].join("\n"),
    );

    expect(dsl).toBe('SET l1 link.hover.textColor="rgb(0, 0, 0)";\nSET a1 transition="spring-duration 0.3s 0 0s";');
    expect(converted).toEqual([
      {
        target: "l1",
        attribute: "link.transition",
        from: "spring-physics 400 40 1 0s",
        to: null,
      },
      {
        target: "l2",
        attribute: "link.transition",
        from: "spring-duration 0.3s 0 0s",
        to: null,
      },
    ]);
    expect(springWarnings(converted)[0]?.message).toContain("only with tween");
  });

  it("measures how long a spring takes to settle", () => {
    // A critically damped spring (damping 2√(stiffness·mass)) settles in about 9.23 / √stiffness seconds.
    expect(settleSeconds(400, 40, 1)).toBeCloseTo(0.46, 1);
    // Overdamped creeps: 200 40 1 is slower than 200 28 1.
    expect(settleSeconds(200, 40, 1)).toBeGreaterThan(settleSeconds(200, 28, 1));
  });
});
