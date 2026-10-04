# Scroll effects

## styleTransformEffect

- **Triggers:**
  - `onScroll` and `onInView` take at most 2 states;
  - `onScrollTarget` takes any number of states, each with its own `sections.<i>.target` (a frame with
    `scrollTargetEnabled="true"` and `elementId`); `target="null"` is the initial state.
- **Write every value of a state.** A state without explicit values gets Framer's defaults (opacity 0.5, scale 0.5),
  so always write `opacity 1`, `scale 1` and the rest. An identity state is stored as `{}`.
- **Write `sections.<i>.*` attribute by attribute.**
- **Removing extra states:** `styleTransformEffect.sections.<i>="null"`, from the highest index down.
- **`onScrollTarget` interpolates; it does not switch.** As a target's top crosses the viewport line (`viewport`
  start / middle / end = 0 / 0.5 / 1 of the window height) and then its bottom, the value moves linearly from the
  previous state to that target's state. `transition` only smooths it. So a continuous change (a progress arc, a bar)
  needs one target over the whole range, not a ladder of small targets.
- **A layer's own `rotation` adds to the states' `rotate`** (70 + 40 shows as 110). Subtract it from the states.
- **Hiding a layer on the site only:** give it a `styleTransformEffect` whose states are all `opacity 0`. Effects do
  not run on the canvas, so the layer stays visible in the editor.

## scrollVariantEffect (Scroll Variants)

- **When it switches:** the instance's variant switches when a target's top crosses `threshold` × the window height
  (0.5 is the middle).
  - Before the first target, the instance shows its own variant.
  - After the last target, the last variant stays. It goes back only with an exit target.
- **Switching at 25 / 50 / 75% with equal steps:** make the first target 50vh longer, and stretch the last target past
  the section (125%) so leaving the section does not revert.
- **Targets** are frames or component instances with `scrollTargetEnabled="true"` and `elementId`.
- **Write `sections` when you create the instance.** A `SET` of the sections on an existing node is silently ignored
  ("0 changes"), so recreate the instance to change them.
- **`serialize` may show temporary names** (`s1`) in the sections even though real ids were written. The site works.

## Pinned step section, without code

Structure of the section (the section itself has no zIndex):

1. **`Background`:** absolute, z0, pinned `0px` on four sides, with its own gradient.
   - It may extend into the next section with a negative `bottom`.
   - It scrolls under the pinned content, so the background seems to change.
   - Soften its top edge with `masks.0.mask="linear-gradient(180deg, rgba(0,0,0,0) 0%, rgb(0,0,0) 12%)"`.
2. **Stage:** `position="sticky"`, `positionStickyTop="0px"`, `height="100vh"`, zIndex 2, transparent. It holds the
   step component instance, switched by `scrollVariantEffect` (or moved by transforms).
3. **Static copies of steps 2–N:** component instances, 100vh each, with `scrollTargetEnabled` and `elementId`. They:
   - give the section its height;
   - show every step in the editor;
   - are the scroll targets.

   Hide them on the site with a `styleTransformEffect` whose states are `opacity 0`.

**Keeping the editor readable:**

- Whatever changes per step is a component with variants, so the editor shows clean frames.
- A `Preview` layer (background, decorations) sits behind a boolean variable: on in the static copies, off on the
  stage.
- Do not leave empty 300vh areas or stacked overlapping layers on the canvas.

## Scroll scenes: the general method (Practice)

Most "impossible" scroll animations are one structure:

1. **Scroll container:** a section as tall as the scene should last (for example `300vh`).
2. **Stage:** a `100vh` frame inside it with `position="sticky"` and `positionStickyTop="0px"`; everything that moves
   lives here.
3. **Timeline:** frames under the stage that act as scroll targets (`scrollTargetEnabled` + `elementId`). Their
   heights are the timeline: a taller target means that step lasts longer. Hide them on the site with opacity 0.
4. **Effects on the stage's children:** `styleTransformEffect` with `trigger="onScrollTarget"` and one state per
   target, or `scrollVariantEffect` on a component instance when each step is a different composition.

Plan it like a timeline in a video tool, only vertical: write down what happens at each target before building.
Field-tested specifics (interpolation, thresholds, hiding the copies, background) are in the sections above.

## Scroll scene patterns (Practice)

Verify each on the published site: the canvas does not run effects.

- **Image zoom:** in a sticky stage, an image frame goes from `scale` 0.6 (or a smaller width in a clipped frame) to
  1 over one target. Text fades out with opacity in the same range.
- **Horizontal scroll:** a sticky stage with a horizontal stack of cards wider than the screen; one
  `styleTransformEffect` target over the whole section moves the stack's `x` from 0 to minus the overflow. The
  overflow depends on the screen width, so set it per breakpoint (replica overrides) and check every breakpoint.
- **Stacking cards:** cards in a vertical stack, each `position="sticky"` with a growing `positionStickyTop` (for
  example 96, 120, 144 px); every card is opaque, so the next one covers the previous. Optionally scale the earlier
  card down slightly (0.95) as the next arrives.
- **Text reveal:** a component with one variant per highlighted phrase, switched by `scrollVariantEffect`; or
  `textEffect` by word with `trigger="onInView"` for a simpler reveal.
- **Progress bar:** `styleTransformEffect` has a uniform `scale` only, no `scaleX`. So put a bar as wide as its track
  inside a clipped track and move the bar's `x` from minus the track width to 0 over one target spanning the article.
  `x` takes px, so set the start per breakpoint.
- **Rotating ring of logos:** a container whose `rotate` follows scroll over one target, the logos inside upright.
- **Layered parallax:** a scene cut into foreground, middle and background layers with different
  `parallaxEffect.speed` (the farther, the slower).
- **Scroll-driven media:** a sequence of frames or a video stepped by scroll needs a code component; say so to the
  user before writing code.

## Shapes driven by scroll

- **An arc that fills, without code:** a ring masked with a `conic-gradient` to its top half, in a frame that clips the
  top. A scroll transform rotates it from 0° to 180°.
- **An arc that scales with the window:**
  - the frame: `width="141%"`, `aspectRatio="2"`, bottom-centered;
  - the circles in it: `width="100%"`, `aspectRatio="1"`, pinned `bottom="0px"`;
  - the moving dot: `centerAnchorY="50%"` with no `top`.

  A fixed 2035px frame showed the arc's ends mid-screen on a 2K display.
