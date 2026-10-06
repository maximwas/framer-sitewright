import { LAYER_EFFECTS, MOTION_DEFAULTS, SCROLL_SPRING } from "../constants/motion.ts";
import type { MotionOptions, MotionPreset } from "../types/motion.ts";

/**
 * The DSL that puts a preset on each layer, in order. Every transform the preset does not move is written as its
 * resting value, because Framer fills in its own (a hover scales to 1.1, a loop spins, a scroll transform starts at
 * half opacity and scale). Transitions are springs without bounce: time springs where Framer keeps only those,
 * physics on scroll transforms.
 */
export function presetCommands(preset: MotionPreset, nodeIds: readonly string[], options: MotionOptions): string[] {
  const delay = options.delay ?? 0;
  const duration = options.duration;

  return nodeIds.map((id, index) => {
    const at = (stagger: number) => seconds(delay + index * (options.stagger ?? stagger));
    const spring = (time: number, start: string) => `spring-duration ${seconds(duration ?? time)} 0 ${start}`;
    const pairs = attributesFor(preset, options, {
      at,
      spring,
    });

    return `SET ${id} ${pairs.map(([key, value]) => (typeof value === "number" ? `${key}=${value}` : `${key}="${value}"`)).join(" ")};`;
  });
}

type Pairs = [string, string | number][];

function attributesFor(
  preset: MotionPreset,
  options: MotionOptions,
  { at, spring }: { at: (stagger: number) => string; spring: (time: number, start: string) => string },
): Pairs {
  const distance = options.distance;

  switch (preset) {
    case "fade-up":
    case "hero-sequence": {
      const hero = preset === "hero-sequence";

      return [
        ["appearEffect.trigger", hero ? "onMount" : "onInView"],
        ...(hero
          ? []
          : ([
              ["appearEffect.replay", "false"],
              ["appearEffect.threshold", "0.2"],
            ] as Pairs)),
        ["appearEffect.enter.opacity", "0"],
        ["appearEffect.enter.x", "0"],
        ["appearEffect.enter.y", String(distance ?? (hero ? MOTION_DEFAULTS.heroDistance : MOTION_DEFAULTS.distance))],
        ["appearEffect.enter.scale", "1"],
        ["appearEffect.enter.rotate", "0"],
        [
          "appearEffect.enter.transition",
          spring(MOTION_DEFAULTS.duration, at(hero ? MOTION_DEFAULTS.heroStagger : MOTION_DEFAULTS.stagger)),
        ],
      ];
    }
    case "text-reveal":
      return [
        ["textEffect.trigger", "onInView"],
        ["textEffect.tokenization", "word"],
        ["textEffect.replay", "false"],
        ["textEffect.delay", at(MOTION_DEFAULTS.stagger)],
        ["textEffect.style.opacity", "0"],
        ["textEffect.style.x", "0px"],
        ["textEffect.style.y", `${distance ?? 12}px`],
        ["textEffect.style.scale", "1"],
        ["textEffect.style.rotate", "0deg"],
        // Framer starts every token blurred by 10px unless told otherwise (seen 06.10.2026).
        ["textEffect.style.blur", "0px"],
        ["textEffect.style.transition", spring(MOTION_DEFAULTS.duration, "0s")],
      ];
    case "hover-lift":
    case "hover-fade":
      return [
        ["hoverEffect.x", "0px"],
        ["hoverEffect.y", preset === "hover-lift" ? `${-(distance ?? 4)}px` : "0px"],
        ["hoverEffect.scale", "1"],
        ["hoverEffect.rotate", "0deg"],
        ["hoverEffect.opacity", preset === "hover-fade" ? "0.85" : "1"],
        ["hoverEffect.transition", spring(MOTION_DEFAULTS.hoverDuration, "0s")],
      ];
    case "press":
      return [
        ["tapEffect.x", "0px"],
        ["tapEffect.y", "0px"],
        ["tapEffect.scale", "0.97"],
        ["tapEffect.rotate", "0deg"],
        ["tapEffect.opacity", "1"],
        ["tapEffect.transition", spring(MOTION_DEFAULTS.pressDuration, "0s")],
      ];
    case "float":
    case "pulse":
    case "spin":
      return [
        ["loopEffect.x", "0"],
        ["loopEffect.y", preset === "float" ? String(-(distance ?? 6)) : "0"],
        ["loopEffect.scale", preset === "pulse" ? "1.04" : "1"],
        ["loopEffect.rotate", preset === "spin" ? "360" : "0"],
        ["loopEffect.opacity", "1"],
        ["loopEffect.repeatType", preset === "spin" ? "loop" : "mirror"],
        ["loopEffect.repeatDelay", "0s"],
        ["loopEffect.pauseOffscreen", "true"],
        [
          "loopEffect.transition",
          spring(preset === "spin" ? MOTION_DEFAULTS.spinDuration : MOTION_DEFAULTS.loopDuration, at(0)),
        ],
      ];
    case "scroll-grow":
    case "parallax": {
      const grow = preset === "scroll-grow";
      const travel = distance ?? MOTION_DEFAULTS.parallax;
      const section = (index: number, opacity: number, scale: number, y: number): Pairs => [
        [`styleTransformEffect.sections.${index}.opacity`, opacity],
        [`styleTransformEffect.sections.${index}.scale`, scale],
        [`styleTransformEffect.sections.${index}.x`, "0px"],
        [`styleTransformEffect.sections.${index}.y`, `${y}px`],
        [`styleTransformEffect.sections.${index}.rotate`, "0deg"],
      ];

      return [
        ["styleTransformEffect.trigger", "onInView"],
        ...section(0, grow ? 0.4 : 1, grow ? 0.86 : 1, grow ? 0 : travel),
        ...section(1, 1, 1, grow ? 0 : -travel),
        ["styleTransformEffect.transition", SCROLL_SPRING],
      ];
    }
    case "ticker":
      return [
        ["tickerEffect.velocity", String(MOTION_DEFAULTS.tickerVelocity)],
        ["tickerEffect.hoverModifier", "50"],
        ["tickerEffect.directionModifier", "default"],
        ["tickerEffect.draggable", "false"],
        ["overflow", "clip"],
      ];
    case "remove":
      return (options.effects ?? LAYER_EFFECTS).map((effect): [string, string] => [effect, "null"]);
  }
}

/** Seconds as Framer writes them: "0.06s", never "0.06000000000000001s". */
function seconds(value: number): string {
  return `${Number(value.toFixed(3))}s`;
}
