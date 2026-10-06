/** The motion presets effects_set writes, each with its whole state and the spring Framer keeps for it. */
export const MOTION_PRESETS = [
  "fade-up",
  "hero-sequence",
  "text-reveal",
  "hover-lift",
  "hover-fade",
  "press",
  "float",
  "pulse",
  "spin",
  "scroll-grow",
  "parallax",
  "ticker",
  "remove",
] as const;

/** What each preset is for, for the tool's description. */
export const MOTION_PRESET_NOTES: Readonly<Record<(typeof MOTION_PRESETS)[number], string>> = {
  "fade-up": "cards and blocks below the fold appear on scroll, one after another",
  "hero-sequence": "the first screen's heading, text and media appear on load, 0.1s apart",
  "text-reveal": "a heading appears word by word as it enters",
  "hover-lift": "a card or button rises 4px on hover",
  "hover-fade": "a link or image dims slightly on hover",
  press: "a button gives way to 97% when pressed",
  float: "a badge or illustration drifts up and down",
  pulse: "a dot or badge breathes in scale",
  spin: "a badge or mark turns slowly",
  "scroll-grow": "an image or section grows from 86% as it scrolls in",
  parallax: "an image moves against the scroll inside a clipped frame (put it on the inner layer)",
  ticker: "a stack of logos or words runs as a marquee, slower on hover",
  remove: "removes the effects named in options.effects (all of them without it)",
};

/** Every effect a layer can carry, for "remove". */
export const LAYER_EFFECTS = [
  "appearEffect",
  "hoverEffect",
  "tapEffect",
  "loopEffect",
  "styleTransformEffect",
  "textEffect",
  "tickerEffect",
  "parallaxEffect",
  "scrollVariantEffect",
] as const;

/** Defaults of the presets: distances in px, times in seconds. */
export const MOTION_DEFAULTS = {
  distance: 24,
  heroDistance: 16,
  stagger: 0.06,
  heroStagger: 0.1,
  duration: 0.5,
  hoverDuration: 0.3,
  pressDuration: 0.2,
  loopDuration: 1.6,
  spinDuration: 6,
  tickerVelocity: 50,
  parallax: 40,
} as const;

/** Scroll transforms keep physics: a slow critically damped spring smooths the scroll without lag. */
export const SCROLL_SPRING = "spring-physics 120 22 1 0s";
