import { describe, expect, it } from "vitest";
import { runOperation } from "../src/operations/define.ts";
import { effectsSet } from "../src/operations/motion/effects-set.ts";
import { createFakeRuntime } from "../src/testing/index.ts";
import { presetCommands } from "../src/utils/motion.ts";

describe("effects_set", () => {
  it("writes the whole start state of an appear, with growing delays and a spring without bounce", () => {
    const dsl = presetCommands("fade-up", ["a", "b"], {});

    // Framer fills in what is not written (a hover scale of 1.1, a loop that spins): every transform is set.
    expect(dsl[0]).toBe(
      'SET a appearEffect.trigger="onInView" appearEffect.replay="false" appearEffect.threshold="0.2" appearEffect.enter.opacity="0" appearEffect.enter.x="0" appearEffect.enter.y="24" appearEffect.enter.scale="1" appearEffect.enter.rotate="0" appearEffect.enter.transition="spring-duration 0.5s 0 0s";',
    );
    expect(dsl[1]).toContain('appearEffect.enter.transition="spring-duration 0.5s 0 0.06s"');
  });

  it("keeps physics on a scroll transform and zeroes what a loop does not move", () => {
    expect(presetCommands("scroll-grow", ["c"], {})[0]).toBe(
      'SET c styleTransformEffect.trigger="onInView" styleTransformEffect.sections.0.opacity=0.4 styleTransformEffect.sections.0.scale=0.86 styleTransformEffect.sections.0.x="0px" styleTransformEffect.sections.0.y="0px" styleTransformEffect.sections.0.rotate="0deg" styleTransformEffect.sections.1.opacity=1 styleTransformEffect.sections.1.scale=1 styleTransformEffect.sections.1.x="0px" styleTransformEffect.sections.1.y="0px" styleTransformEffect.sections.1.rotate="0deg" styleTransformEffect.transition="spring-physics 120 22 1 0s";',
    );
    expect(presetCommands("float", ["d"], {})[0]).toContain('loopEffect.rotate="0"');
  });

  it("regression: a text reveal starts sharp: Framer blurs every word by 10px unless told", () => {
    expect(presetCommands("text-reveal", ["t"], {})[0]).toContain('textEffect.style.blur="0px"');
  });

  it("removes effects by setting them to null", () => {
    expect(presetCommands("remove", ["e"], { effects: ["hoverEffect", "loopEffect"] })).toEqual([
      'SET e hoverEffect="null" loopEffect="null";',
    ]);
  });

  it("applies a preset through design_apply, so it is journaled and undoable", async () => {
    const { runtime, state } = createFakeRuntime();

    // The fake Framer knows no layer "btn": what matters is the DSL that reached it.
    await runOperation(
      effectsSet,
      { runtime },
      {
        preset: "press",
        nodeIds: ["btn"],
      },
    );

    expect(state.appliedDsl.at(-1)).toContain('SET btn tapEffect.x="0px" tapEffect.y="0px" tapEffect.scale="0.97"');
  });
});
