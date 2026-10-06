# Motion

Before building an animated pattern, read Framer's implementation guide for it through the task map: "Effects", "FAQ"
(accordions), "Navigations" (menus), "Overlays" or "Buttons". The rules below correct and extend those guides.

## States first: anything that moves or responds

Before building a menu, carousel or slider, timer or progress indicator, reel, scroll effect, accordion, tabs or any
other part that moves or responds, write its states and transitions as a list, then build every row of it:

- the first load, before anything is touched;
- each step, and each step already completed;
- the loop back to the start;
- the interrupted paths: the page opened mid-way (a link to an anchor, a reload), scrolled away and back, a link inside
  the part used, another page and back;
- touch and mouse (touch has no hover);
- reduced motion (Performance and accessibility, below).

Every list keeps these:

- **A progress indicator moves at the speed of the time it shows,** and finished steps stay finished until the loop
  starts again. It is the one transition that is not a spring: a linear tween (`tween 0,0,1,1 <duration> 0s`) whose
  duration is the time it tracks (the autoplay delay).
- **What opens over the page** (a menu, a modal, a dropdown) never changes the page's layout or scroll position, and
  closes when one of its own links is used.
- **An invisible layer never takes taps:** a layer that is transparent or covered in a state gets
  `pointerEvents="none"` there, or it blocks what lies under it.
- **A scroll-triggered effect starts when its element enters the screen,** on every breakpoint and down to the last
  block of the page (Appear, below).

Then go through every row in a real browser ([verify.md](verify.md), Behaviour in a real browser): a screenshot shows
one state, never the change between them.

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
  | Page transition | ≤ 0.45 s (`400 40 1`) |
  | Text reveal, total | ≤ 1.5 s |
  | Loader | < 1 s |

- **Springs only, no bounce, never `tween` or a bezier** (a firm rule, not only Practice), even when a reference
  copies CSS easing; the one exception is a progress indicator that shows time (States first, above). Critically
  damped physics, damping = 2·√(stiffness·mass): `1000 63 1` for hover and press (settles in 0.3s), `400 40 1` for
  buttons, tabs and menus (0.45s), `200 28 1` for larger moves (0.65s), `120 22 1` for slow scroll motion. More
  damping makes a spring creep (`200 40 1` lands after about 1s).
- **Where Framer keeps only time springs** (see the table below), write the same feel as `spring-duration <time> 0
  <delay>`: `0.3s`, `0.45s`, `0.65s`. Convert by hand, and tell the user which transitions to switch to Physics in the
  editor if they want physics there.
- **Distances:** fade-up `y` 8–24 px (up to 40 for large media); scale-in from 0.96–0.98, never 0.5; hover lift `y`
  −2 to −4 px; image zoom 1.03–1.05 inside a frame with `overflow="clip"`. Buttons and nav links do not scale on
  hover.
- **Stagger:** 0.04–0.08 s between siblings, 0.02–0.05 s between the words of a heading, written as growing delays in
  each item's transition. Budget the group, not the item: the last item starts within 0.3–0.4 s of the first. In a
  grid, use `min(0.05 × (row + col), 0.3)` s, a diagonal wave, not 0.06 s × 12 cards (0.66 s for the last). Exits get
  no stagger.
- **On a CMS Collection List** every item is the same layer, so growing delays are impossible: put the appear on the
  list and stagger its items with `appearEffect.enter.stagger`. Check it in Preview.
- **Viewport:** appear when about 20% of the element is visible (`appearEffect.threshold="0.2"`), and play once
  (`appearEffect.replay="false"`).

## Performance and accessibility (Practice)

- **Animate only `transform` and `opacity`:** x, y, scale, rotate, opacity. Animating width, height, padding or margin
  forces layout on every frame. (Opening things are the exception: they animate height by design.)
- **Nothing scroll-linked above the fold;** an appear on the hero copy is fine, but not from `opacity` 0 on the LCP
  element (see Appear).
- **Keep blur below 10** and shadows few: big blurs and stacked shadows stutter on low-end phones.
- **Phones:** fewer simultaneous animations; drop decorative ones on small breakpoints when they cost smoothness.
- **Reduced motion is opt-in.** Framer's Reduced Motion setting (Site Settings → General → Accessibility) limits
  animation to opacity for visitors whose device asks for reduced motion, but only when it is on. Set
  `metadata.reducedMotion="true"` on the `RootNode` for every site (it also covers custom cursors). Transforms then
  stay at the layer's position on the canvas, so the canvas layout is the no-motion version: a scroll-transform
  signature must read at rest, and numbers it animates are also written as text. Check the site with the system
  setting on; "the ticker or appear does nothing" reports usually come from it or Low Power Mode.
- **No scroll hijacking.** Animate relative to scroll; never change how scrolling itself behaves.

## Appear

- **Trigger:** `appearEffect.trigger="onMount"` above the fold, `onInView` below it.
- **Not from opacity 0 on the LCP element** (Practice). Chrome ignores opacity-0 paints, so a hero heading or main
  image that appears from `opacity` 0 on load records LCP late. Give it a visible start (`opacity` 0.1 or more, or `y`
  only) or leave it still; the smaller items around it may fade from 0.
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
- **The end of the page is the same trap:** a layer in the last block whose start offset pushes it under a clipped
  edge, or whose threshold the page's end cannot reach, never plays on the breakpoints where it sits lowest. Reveal
  such a layer with opacity only, and scroll every page to its end on every breakpoint.

## Hover and press

- **Surfaces:** `hoverEffect.backgroundColor` or `hoverEffect.opacity`, always with `hoverEffect.scale="1"`. Scale
  only when the user asks for it.
- **Components:** use gesture variants (`gesture="hover"`, `"pressed"`). Effects on a variant root are refused.
- **One change per hover:** a color, or a small directional cue. People read a label that rolls up (a second copy in
  a clipped mask), a pill popping in behind a nav link, or a scale jump as glitches. Nav links change only their text
  color.
- **An arrow cue without layout shift:** after the label, an `Arrow` frame (`overflow="clip"`, `width="0px"`,
  `stackDistribution="end"`) holds "→" in the button's text style. The hover variant sets it to `22px` and takes 11px
  off each side padding (37 → 26), so the button keeps its width and the label slides left as the arrow arrives.
- **Nothing lives only on hover** (Practice): phones have none, so content or actions shown on hover need a tap or
  always-visible equivalent, and a slider is draggable on touch. A hover effect or a pointer cursor promises a click:
  only clickable layers get them, and an image zooms on hover only inside a clickable card.
- **Change a size by moving, not by sizing or scaling.** Framer snaps a height that goes to 0 instead of animating it,
  and `scale` is uniform (there is no `scaleX`), so a bar that grows by scale also gets thinner while it moves. Keep
  the bar at its full size inside a clipped track and move it in and out (`x` or `top`) between the states
  ([scroll.md](scroll.md), Progress bar).

## Springs: which survive where

| Attribute | Keeps | Rewrites |
| --- | --- | --- |
| Variant `transition`, `appearEffect`, `hoverEffect`, `tapEffect`, `flowEffect`, `textEffect`, overlays, `customCursor`, `lightboxEffect` | `spring-duration <time> <bounce> <delay>` | `spring-physics` becomes `spring-duration 0.4s 0.2` (0s on an overlay backdrop), or is ignored on a node with its own transition |
| `loopEffect.transition` | `spring-duration` | `spring-physics` becomes `spring-duration 1s 0.25`; no transition at all becomes a linear `tween 0,0,1,1 1s 0s` |
| `styleTransformEffect.transition` | `spring-physics <stiffness> <damping> <mass> <delay>` | `spring-duration` becomes the default physics `500 60 1` |
| `pageEffects.*.transition` | `spring-physics` | `spring-duration` is ignored |
| `tickerEffect.transition`, `scrollVariantEffect.transition` | nothing: the field does not exist | accepted without an error and dropped. A ticker's speed is `tickerEffect.velocity`; a scroll variant animates with the component's variant `transition` |
| `dragEffect.transition` | `inertia <stiffness> <damping>` | a spring is refused. Write `inertia 400 40` (damping = 2·√stiffness): Framer's default `400 30` bounces |
| `link.transition` (link styles) | tween only | every spring and `instant` are refused: leave it unset |

- **Physics on a variant or appear:** when the user wants it, tell them to set it in the editor.
- **Always write the delay:** `spring-physics 150 30 1 0s`. Without it, Framer reports "<delay> undefined".

## Loop

- **Zero what you don't animate:** always write `loopEffect.rotate="0"`, and zero every other transform you don't
  animate.
- **Always write `loopEffect.transition`.** Without one Framer stores `tween 0,0,1,1 1s 0s`, a linear tween. Use a time
  spring without bounce (`spring-duration 0.9s 0 0s`).
- **A spin eases at every turn:** a spring starts and stops each cycle. Give a spin (`rotate="360"`, `repeatType` loop)
  a long spring (4–6 s) on one small mark, or leave it out; never a tween.
- **A loop is not per variant:** a `loopEffect` written on a variant's copy (`<variant id><node id>`) lands on the
  primary node and in every variant. For a loop that shows in one state only (a loader dot in Pending), keep the layer
  hidden (`visible="false"`) in the other variants.
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
   the same transition. Then the items and the sections below glide; without the page-level one, the blocks below jump
   in a single frame.

**Mobile menu:** a Phone variant of 64px and a Phone Open variant with height `auto`, as in the "Navigations" guide.

**Exception:** if the user wants the answer to *appear* as it opens, hide it with `visible="false"` in Closed and give
it `appearEffect.trigger="onMount"`. Do not use `onInView`, which is a scroll trigger. A layout jump preventer goes
first in the variant root (see [components.md](components.md)). Never for FAQ answers or other content people search
for: text hidden with `visible="false"` is not indexed (Framer Help). Keep it in the closed variant, clipped at height
0 with opacity 0.

## Overlays

- **Modal:** a `FixedOverlayNode` as a child of the trigger frame, opened by `onTap.0.action="SHOW_OVERLAY"
  onTap.0.controls.overlay="<overlay id>"`, with `backdrop.fill` (a token), `backdrop.dismissible="true"`,
  `backdrop.blockScroll="true"` and `zIndex="10"`. The dialog is absolute with `centerAnchorX="50%"
  centerAnchorY="50%"`, `width="92%"` and a `maxWidth`, plus a close button with `onTap.0.action="DISMISS_OVERLAY"` and
  `ariaLabel`.
- **One trigger per overlay:** a `SHOW_OVERLAY` that names an overlay under another trigger fails ("The target must be
  a direct child of `<trigger>`"). For a second button, `DUPE <overlay id> newId="<tmp>" parent="<second trigger
  id>";` and point its `SHOW_OVERLAY` at the copy. Keep the dialog's content in a component instance so the copies stay
  alike. `DUPE` rewrites a copied form's `formSubmitButtonId`, but set its button state variants again.
- **Escape cannot be wired:** `onKeyDown` keeps its action but drops `controls.key` without an error, and a handler
  without a key fires on any key, Tab included, so remove it (`onKeyDown="null"`). Every modal closes by its backdrop
  and by a visible close button.
- **Dropdown:** a `RelativeOverlayNode` inside the trigger with `floatingPlacement`, `floatingAlignment`,
  `floatingOffsetY`, `floatingCollisionDetection="true"` and `floatingSafeArea="true"`. It works inside a component
  too. **Lightbox:** `lightboxEffect.padding`, `maxWidth`, `zIndex`, `backdrop` (a token) and `transition` on each
  image-fill frame.
- **Screenshots cannot capture overlay content:** see [verify.md](verify.md).

## Micro-interactions (Practice)

Small, consistent feedback on everything clickable. Build each once, inside a component, and reuse it.

- **Button:** a hover gesture variant with a slightly lighter or darker fill, or `opacity` 0.85–0.9; optionally a
  pressed variant with scale 0.97 on a child. Arrow icons can slide `x` 2–4 px in the hover variant.
- **Text link:** a link style, `+LinkStylePresetNode navLink name="Nav Link" link.textColor="var(--token-<id>)"
  link.hover.textColor="var(--token-<id>)" link.current.textColor="var(--token-<id>)";`, then
  `linkStylePreset="<link style id>"` on the text. It replaces Framer's blue and marks the current page; an underline on
  hover is `link.hover.textDecoration="underline"`. Leave `link.transition` unset: link styles take only tween easing
  and refuse every spring and `instant`, so the link changes at once.
- **Card:** hover lifts it (`y` -4 px) and deepens its shadow; the image inside zooms to 1.05 in a frame with
  `overflow="clip"`.
- **Image reveal or swap:** stacked images in a component, the top one at opacity 1 and the rest at 0; hover variants
  change which one is visible by opacity.
- **Before/after compare without code:** a component with variants Split 10…90 whose root is a horizontal stack, gap
  0, `overflow="clip"`. Before: width 50% (changed per variant), the image fill with `fillImagePositionX="left"` and the
  old-look filters. After: `width="1fr"`, the same image with `fillImagePositionX="right"`. Crop the image to the
  root's exact aspect, so both halves render at one scale and the seam disappears; put `aspectRatio` on the instance.
  On top, a Zones layer of five transparent frames: zone i sets Split i on `onMouseEnter` and on `onTap`. `dragEffect`
  cannot drive it: a drag only moves the layer and fires no event, so it changes no variant or variable. Check the
  scrub in Preview.
- **3D tilt:** a hover variant with a small `rotateX` / `rotateY` (≤ 8deg). `perspective` is refused on a variant
  root: put it on a child frame (`perspective="1000px"`) that holds the tilting layer. Use on one hero object at most.
- **Custom cursor:** a small component (a "View" pill), then on the layer `customCursor.componentNodeId="<component
  id>" customCursor.follow="true" customCursor.placement="right" customCursor.alignment="center"
  customCursor.offsetX="12px" customCursor.offsetY="0px"`. Use the component's real id. Framer adds the primary
  variant, and `offsetY` defaults to 20px, so write it. Leave `customCursor.transition` unset, as Framer's guide
  advises. Touch screens show no cursor; check it in Preview.
- **Complex paths** (curves, several steps): add mid-state variants between start and end, then chain them with
  `onAppear.0.action="SET_VARIANT"` and short delays; the click goes only to the first mid-state.

## Page transitions and loaders (Practice)

- **Page transitions** are `pageEffects` on a page's primary breakpoint: `pageEffects.all.*` for every page (on the
  home page), or `pageEffects.<other page id>.enter.*` / `.exit.*` for one pair. Use opacity with a short `y` (48px) or
  `scale` 0.98, an iris (`enter.mask.type="circle"` with `mask.x="50%"` `mask.y="50%"`) or a wipe (`mask.type="wipe"`
  with `mask.angle`). Framer keeps only `spring-physics` there and ignores a `spring-duration`: `400 40 1 0s` for a
  fade or a short slide on content sites, masks and `200 28 1 0s` on portfolios only. Agency and portfolio sites treat
  one global transition as standard.
- **Check them on the published site in a real browser:** which page's effect plays in which direction is not
  documented, so try both directions. Set every page breakpoint's `fill`: it shows during the transition. Page
  Effects run on View Transitions, so check Safari and Firefox too.
- **Loaders:** only when the site really needs one, under one second, a simple mark or bar. A loader that waits for a
  fixed timer only delays the content.

## Other effects

- **`textEffect`:** by word, line or character (`textEffect.tokenization`), on headings and short lines only, never on
  auto-fit text; `onMount` for the hero headline, `onInView` elsewhere, `y` 10–20. A new one blurs every token by
  10px: write `textEffect.style.blur="0px"` unless blur is wanted. Its transition's delay is always stored as 0.05s:
  delay the whole effect with `textEffect.delay`. `trigger="onScrollTarget"` is accepted but takes no target: use
  `onInView`. Build chunks with separate appears only when images sit between the words.
- **`tickerEffect.*`:** marquees on a stack or a CMS collection list frame, with `overflow="clip"`. Speed is `velocity`
  (there is no transition); `hoverModifier` is the speed on hover in % (`0` stops it). Fade the ends with a mask on the
  clipped frame: `masks.0.mask="linear-gradient(90deg, rgba(0,0,0,0) 0%, rgb(0,0,0) 10%, rgb(0,0,0) 90%,
  rgba(0,0,0,0) 100%)"`. Logos and words only, never text people must read.
- **A pause for anything that moves by itself** for more than 5 s beside other content (WCAG 2.2.2): tickers, shaders,
  autoplaying sliders. Pause on hover reaches only mouse users. Put the moving part in a component with a `Paused`
  variant that overrides `tickerEffect.velocity="0"` (a shader: `$control__speed="0"`), toggled by a button with
  `onTap.0.action="SET_VARIANT"` `onTap.0.controls.variant="cycle"` and an `ariaLabel`.
- **`parallaxEffect.speed`:** below 100 the layer lags behind the scroll, so it only moves down.
  - To remove the effect, write `parallaxEffect="null"`. `speed="null"` leaves the effect in place.
  - It counts from the top of the page: the layer moves (speed/100 − 1) × scrollY, so at speed 85 a layer 7000px down
    sits about 1000px off its frame, and the DSL has no offset for it. Use it in the first screen only.
  - Further down, use `styleTransformEffect` with `trigger="onInView"` (a `y` on the inner layer of a clipped frame).
    It moves only while the layer comes in ([scroll.md](scroll.md), triggers).
  - Either way the moving layer is larger than its frame by its travel, or its edge shows.
- **Removing any effect:** `<effect>="null"`.
