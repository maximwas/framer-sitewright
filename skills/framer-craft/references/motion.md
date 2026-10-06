# Motion

Before building an animated pattern, read Framer's implementation guide for it through the task map: "Effects", "FAQ"
(accordions), "Navigations" (menus), "Overlays" or "Buttons". The rules below correct and extend those guides.

## Motion system (Practice)

Decide the motion once per site, like a design token set, and reuse it everywhere.

- **Budget:** two or three motion patterns for the whole site (for example: appear on scroll, hover lift, one scroll
  scene). Motion on every element reads as noise.
- **Durations by purpose:**

  | Purpose | Duration |
  | --- | --- |
  | Hover and press feedback | 0.1–0.2 s |
  | Appear (fade-up) | 0.3–0.6 s |
  | Variant change (accordion, menu, tabs) | 0.3–0.4 s |
  | Page transition | ≤ 0.4 s |
  | Text reveal, total | ≤ 1.5 s |
  | Loader | < 1 s |

- **Springs only, no bounce, never `tween` or a bezier** (Maxim's rule), even when a reference copies CSS easing.
  Critically damped physics, damping = 2·√(stiffness·mass): `1000 63 1` for hover and press (settles in 0.3s),
  `400 40 1` for buttons, tabs and menus (0.45s), `200 28 1` for larger moves (0.65s), `120 22 1` for slow scroll
  motion. More damping makes a spring creep (`200 40 1` lands after about 1s).
- **Where Framer keeps only time springs** (see the table below), write the same feel as `spring-duration <time> 0
  <delay>`: `0.3s`, `0.45s`, `0.65s`. Sitewright's `design_apply` converts a written `spring-physics` itself; with the
  Framer CLI, convert by hand, and tell Maxim which transitions to switch to Physics in the editor.
- **Distances:** fade-up `y` 15–40 px (more looks like a jump); hover lift `y` -4 px; hover scale for buttons and
  cards 1.02–1.05; image zoom inside a clipped frame 1.05.
- **Stagger:** 0.05–0.1 s between siblings (0.06 s in grids), written as growing delays in each item's transition.
- **Viewport:** appear when about 20% of the element is visible (`appearEffect.threshold="0.2"`), and play once
  (`appearEffect.replay="false"`).

## Performance and accessibility (Practice)

- **Animate only `transform` and `opacity`:** x, y, scale, rotate, opacity. Animating width, height, padding or margin
  forces layout on every frame. (Opening things are the exception: they animate height by design.)
- **Nothing scroll-linked above the fold;** an appear on the hero copy is fine.
- **Keep blur below 10** and shadows few: big blurs and stacked shadows stutter on low-end phones.
- **Phones:** fewer simultaneous animations; drop decorative ones on small breakpoints when they cost smoothness.
- **Reduced motion:** Framer honors `prefers-reduced-motion`; never fight it. The site setting
  `metadata.reducedMotion` on the `RootNode` exists for sites that must calm motion everywhere.
- **No scroll hijacking.** Animate relative to scroll; never change how scrolling itself behaves.

## Appear

- **Trigger:** `appearEffect.trigger="onMount"` above the fold, `onInView` below it.
- **Motion:** start from `opacity` 0 and a small `y` (8–24px), with a spring without bounce of 0.45–0.65s:
  `appearEffect.enter.transition="spring-duration 0.5s 0 0s"`. The values are the duration, the bounce and the delay.
- **Sequences:** step the delays. `stagger` is a separate attribute (`appearEffect.enter.stagger`).
- **Replay:** `appearEffect.replay="false"` makes `onInView` play once. `onMount` plays once anyway.
- **Use `spring-duration` on an `onMount` appear, never physics.** A physics spring there makes Framer restart the
  opacity animation after hydration, and the layer vanishes for one frame when it ends. This is a framer-motion bug
  that a project cannot fix.
- **Parallax and appear on one layer fight over `y`.** Put the parallax on the child and the appear on the wrapper.
- **An appear needs a layer that is in view in its start state.** The layer is measured with its start state applied:
  one that the start state moves fully out of a clipped parent (a bar at `x -720` inside an `overflow="clip"` track)
  never counts as in view, never plays, and stays hidden on the site. Put the effect on the visible parent.

## Hover and press

- **Surfaces:** `hoverEffect.backgroundColor` or `hoverEffect.opacity`, always with `hoverEffect.scale="1"`. Scale
  only when the user asks for it.
- **Components:** use gesture variants (`gesture="hover"`, `"pressed"`). Effects on a variant root are refused.
- **One change per hover:** a color, or a small directional cue. Users called a label that rolls up (a second copy in
  a clipped mask), a pill popping in behind a nav link, or a scale jump glitches. Nav links change only their text
  color.
- **An arrow cue without layout shift:** after the label, an `Arrow` frame (`overflow="clip"`, `width="0px"`,
  `stackDistribution="end"`) holds "→" in the button's text style. The hover variant sets it to `22px` and takes 11px
  off each side padding (37 → 26), so the button keeps its width and the label slides left as the arrow arrives.

## Springs: which survive where

| Attribute | Keeps | Rewrites |
| --- | --- | --- |
| Variant `transition`, `appearEffect`, `hoverEffect`, `tapEffect`, `flowEffect`, `textEffect`, overlays | `spring-duration <time> <bounce> <delay>` | `spring-physics` becomes `spring-duration 0.4s 0.2` (0s on an overlay backdrop), or is ignored on a node with its own transition |
| `loopEffect.transition` | `spring-duration` | `spring-physics` becomes `spring-duration 1s 0.25` |
| `styleTransformEffect.transition` | `spring-physics <stiffness> <damping> <mass> <delay>` | `spring-duration` becomes the default physics `500 60 1` |
| `pageEffects.*.transition` | `spring-physics` | `spring-duration` is ignored |
| `dragEffect.transition` | `inertia` | a spring is refused |

- **Physics on a variant or appear:** when the user wants it, tell them to set it in the editor.
- **Always write the delay:** `spring-physics 150 30 1 0s`. Without it, Framer reports "<delay> undefined".

## Loop

- **Zero what you don't animate:** always write `loopEffect.rotate="0"`, and zero every other transform you don't
  animate.
- **A rhythmic bob or pulse:** a critically damped spring (damping = 2√stiffness, for example `100 20 1`, written as
  its time spring `spring-duration 0.9s 0`), with `repeatType` mirror and `repeatDelay` 0. A bouncy spring (300/20) makes each layer settle
  differently.
- **A wave across several layers cannot be phased with `loopEffect`.** Framer adds the transition delay before every
  half-cycle, so the phases drift. Use a component with frames Rest, Step 1…N that advance on their own (`onAppear`
  with `SET_VARIANT cycle`, see [components.md](components.md)).
- **Keep loops rare.** Endless motion distracts.

## Things that open (accordion, mobile menu, dropdown)

Do not hide the content with `visible="false"`: it pops in without animation, even though Framer's own example does
it. Instead:

1. **Closed variant:** a fixed height (the header row) and `overflow="clip"`. The hidden part gets `opacity="0"`.
2. **Open variant:** `height="auto"`, `overflow="clip"`, opacity 1. Both variants get the same `transition`.
3. **Icon:** swap or rotate it in the same variants. Put `userSelect="none"` on clickable text.
4. **`flowEffect.transition`** goes on the stack that holds the items **and** on the page's primary breakpoint, with
   the same transition. Then the items and the sections below glide. Measured: without the page-level one, the next
   block jumps 74px in a single frame.

**Mobile menu:** a Phone variant of 64px and a Phone Open variant with height `auto`, as in the "Navigations" guide.

**Exception:** if the user wants the answer to *appear* as it opens, hide it with `visible="false"` in Closed and give
it `appearEffect.trigger="onMount"`. Do not use `onInView`, which is a scroll trigger. A layout jump preventer goes
first in the variant root (see [components.md](components.md)).

## Micro-interactions (Practice)

Small, consistent feedback on everything clickable. Build each once, inside a component, and reuse it.

- **Button:** a hover gesture variant with a slightly lighter or darker fill, or `opacity` 0.85–0.9; optionally a
  pressed variant with scale 0.97 on a child. Arrow icons can slide `x` 2–4 px in the hover variant.
- **Text link:** a link style preset with `link.hover.textColor`, or an underline that appears on hover
  (`link.hover.textDecoration="underline"` with `link.transition="spring-duration 0.3s 0 0s"`).
- **Card:** hover lifts it (`y` -4 px) and deepens its shadow; the image inside zooms to 1.05 in a frame with
  `overflow="clip"`.
- **Image reveal or swap:** stacked images in a component, the top one at opacity 1 and the rest at 0; hover variants
  change which one is visible by opacity.
- **3D tilt:** a hover variant with a small `rotateX` / `rotateY` (≤ 8deg) and `perspective` on the parent. Use on one
  hero object at most.
- **Complex paths** (curves, several steps): add mid-state variants between start and end, then chain them with
  `onAppear.0.action="SET_VARIANT"` and short delays; the click goes only to the first mid-state.

## Page transitions and loaders (Practice)

- **Page transitions** are `pageEffects` on the home page's primary breakpoint (`pageEffects.all` for every page):
  ease-out on enter, ease-in on exit, 0.4 s or less. A fade or a short slide is enough.
- **Loaders:** only when the site really needs one, under one second, a simple mark or bar. A loader that waits for a
  fixed timer only delays the content.

## Other effects

- **`textEffect`:** by word or by character; not on auto-fit text.
- **`tickerEffect.*`:** marquees. It also runs on a CMS collection list frame. Give it `overflow="clip"`.
- **`parallaxEffect.speed`:** below 100 the layer lags behind the scroll, so it only moves down.
  - To remove the effect, write `parallaxEffect="null"`. `speed="null"` leaves the effect in place.
  - Far down the page, use `styleTransformEffect` with `trigger="onInView"` instead: parallax counts from the top of
    the page.
- **Removing any effect:** `<effect>="null"`.
