# Scroll effects

## styleTransformEffect

- **Triggers:**
  - `onScroll` and `onInView` take at most 2 states;
  - `onScrollTarget` takes any number of states, each with its own `sections.<i>.target` (a frame with
    `scrollTargetEnabled="true"` and `elementId`); `target="null"` is the initial state.
  - `viewport` (start by default) applies only to `onScrollTarget`. `onInView` runs from the layer's top entering at
    the bottom of the window until its bottom reaches the bottom of the window, then stops, so an `onInView` parallax
    moves only while the layer comes in. `onScroll` spans the whole page, 0 at the top and 1 at the bottom.
- **Create a target before the effect that names it.** A `sections.<i>.target` that points at a node created later in
  the same batch is refused ("Every target section must be a scroll target in the same scope"), and the rest of the
  batch is applied. Create the target, with `elementId` and `scrollTargetEnabled="true"`, earlier in the batch (a
  parent created before its child works). A scroll transform can also get its sections in a later `SET`; a scroll
  variant cannot (a `SET` of its sections is ignored), so create its instance after its targets.
- **Write every value of a state.** A state without explicit values gets Framer's defaults (opacity 0.5, scale 0.5),
  so always write `opacity 1`, `scale 1` and the rest. An identity state is stored as `{}`.
- **Write `sections.<i>.*` attribute by attribute,** numbers without quotes (`sections.0.opacity=0.15`): a quoted
  value inside a list fails with "Expected number", and a JSON string for `sections` fails the same way. A new effect's
  first state already has `scale 0.5` from the preset, so writing only its opacity keeps a scale that makes
  left-aligned text drift sideways. `styleTransformEffect=null` removes the effect.
- **A statement does not need scroll scrubbing:** a fade tied to scroll leaves the text faint while people read it.
  An `appearEffect` per chunk (y 24, opacity 0, 0.06s apart) reads as intended.
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
- **Scroll direction does not work through the DSL.** `scrollVariantEffect.trigger="onScrollDirection"` keeps
  `direction` and drops `fromVariant`, `toVariant` and `sections.0.variant` without an error.
  `appearEffect.trigger="onScrollDirection"` keeps `enter` and `exit` but no direction (`appearEffect.direction` is
  accepted and dropped), and Framer's runtime skips the effect without one. A header that hides on scroll down needs a
  code override: say so before promising it.
- **A header that changes after the hero:** a header component with `Top` and `Scrolled` variants. Its instance (seen
  on the page itself) gets `position="sticky"`, `scrollVariantEffect.trigger="onScrollTarget"`,
  `sections.0.variant="<Top id>"`, `sections.1.target="<first section after the hero>"` (or an invisible trigger frame
  there, with no fill) and `sections.1.variant="<Scrolled id>"`, written when the instance is created. The switch
  animates with the component's variant `transition`. Check it in Preview.

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

   Hide them on the site with a `styleTransformEffect` whose states are `opacity 0`, and `pointerEvents="none"`.
   Opacity 0 and `pointerEvents="none"` hide them from the eye and the mouse, not from screen readers or the Tab key.
   Put the step's links and buttons behind a boolean variable that the copies turn off.
   Read the states back: opacity only. A `scale` left in a state (seen: `scale 0.5`) shrinks the invisible track, so
   the targets sit elsewhere on screen than in the layout: steps switch at the wrong scroll, and code that measures
   them gets wrong positions. Reset it with `scale="1"`; `null` is refused.

**On phone**, unpin the scene on the Phone copies: the stage `position="relative"`, its instance
`scrollVariantEffect="null"`, and the copies' hiding `styleTransformEffect="null"`, so step 1 and the copies read as a
stack. Where a scene stays pinned, keep each step's content out of the bottom 15% of the stage: Framer has no
`svh`/`dvh`, and on iOS Safari `100vh` is taller than the visible area while the toolbar shows.

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
- **Horizontal scroll:** the section holds a sticky `Stage` (`height="100vh"`, `overflow="clip"`) with a horizontal
  stack `Track`, then, right after the stage, a `Timeline` frame (`elementId`, `scrollTargetEnabled="true"`,
  `pointerEvents="none"`) as tall as the travel (track width minus window width), so the track moves 1 px across per
  1 px down. On `Track`: `styleTransformEffect.trigger="onScrollTarget"`, `viewport="end"`, state 0 `x=0px`, state 1
  targeting the Timeline with `x=-<travel>px`, opacity and scale 1 in both, `spring-physics 300 35 1 0s`. A target
  right after a 100vh stage with `viewport` end starts exactly when the section reaches the top, so its height is the
  pin length; a target over the whole section slides the first or last cards while the stage is not pinned.
  Breakpoint copies take their own `styleTransformEffect` (another `x`, with the Timeline's height to match). On
  phone, set the Track copy's `styleTransformEffect="null"`, give the stage's copy `position="relative"` and
  `overflow="auto"` for a native swipe, and hide the Timeline.
- **Stacking cards:** cards in a vertical stack, each `position="sticky"` with a growing `positionStickyTop` (for
  example 96, 120, 144 px); every card is opaque, so the next one covers the previous. To shrink the card underneath
  (0.94–0.96) as the next arrives, give it `styleTransformEffect.trigger="onScrollTarget"` with `viewport="end"` and the
  next card as its target (`elementId`, `scrollTargetEnabled="true"`), state 1 `scale=0.94`, opacity 1 in both. Use
  `end`: a sticky target moves with the scroll and never crosses the `start` line. Leave about one card of bottom
  padding after the last one.
- **Text reveal:** a component with one variant per highlighted phrase, switched by `scrollVariantEffect`; or
  `textEffect` by word with `trigger="onInView"` for a simpler reveal.
- **Progress bar:** `styleTransformEffect` has a uniform `scale` only, no `scaleX`. So put a bar as wide as its track
  inside a clipped track and move the bar's `x` from minus the track width to 0 over one target spanning the article.
  `x` takes px, so set the start per breakpoint.
- **Rotating ring of logos:** a container whose `rotate` follows scroll over one target, the logos inside upright.
- **Layered parallax:** a scene cut into foreground, middle and background layers with different
  `parallaxEffect.speed` (the farther, the slower), in the first screen only. Each moving layer is larger than its
  clipped frame by its travel (`bottom="-180px"` for 180px), or its edge shows. Layers at different speeds are the
  motion most likely to make people dizzy: keep them few and subtle.
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
