import type { LAYER_EFFECTS, MOTION_PRESETS } from "../constants/motion.ts";

export type MotionPreset = (typeof MOTION_PRESETS)[number];

export type LayerEffect = (typeof LAYER_EFFECTS)[number];

/** What a preset may be tuned with; each has a default in MOTION_DEFAULTS. */
export interface MotionOptions {
  /** Seconds before the first layer starts. */
  readonly delay?: number | undefined;
  /** Seconds between layers, in the order given. */
  readonly stagger?: number | undefined;
  /** Pixels of travel (appear, lift, float, parallax). */
  readonly distance?: number | undefined;
  /** Seconds a time spring takes. */
  readonly duration?: number | undefined;
  /** For "remove": the effects to take off; all of them when omitted. */
  readonly effects?: readonly LayerEffect[] | undefined;
  /** Replaces the preset's trigger (onInView, onMount, onScroll, onScrollTarget…). */
  readonly trigger?: string | undefined;
  /** Replaces the opacity the preset starts from. */
  readonly opacity?: number | undefined;
  /** Replaces the preset's transition with this spring, as the DSL writes it. */
  readonly transition?: string | undefined;
}
