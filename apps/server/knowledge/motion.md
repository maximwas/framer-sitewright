# How motion works in Framer

How Framer stores and plays transitions, effects, variants and scroll scenes, and how to build what the design asks
for. Which motion a site gets is the user's decision. Effects never run on the canvas or in screenshots: check them in
a real browser (`verify`, Behaviour in a real browser), and tell the user so.

## States: anything that moves or responds

Before building a menu, carousel or slider, timer or progress indicator, reel, scroll effect, accordion, tabs or any
other part that moves or responds, list its states and transitions as the design defines them, then build every row:

- the first load, before anything is touched;
- each step, and each step already completed;
- the loop back to the start;
- the interrupted paths: the page opened mid-way (a link to an anchor, a reload), scrolled away and back, a link inside
  the part used, another page and back;
- touch and mouse (touch has no hover);
- reduced motion (Transitions, below).

Framer facts that decide whether those rows work:

- **An invisible layer still takes taps:** a layer that is transparent or covered in a state gets
  `pointerEvents="none"` there, or it blocks what lies under it.
- **A scroll-triggered effect starts when its element enters the screen** (Appear needs a visible layer, below).
- A progress indicator that shows time needs a linear tween (`tween 0,0,1,1 <duration> 0s`) whose duration is the time
  it tracks: a spring does not move at a constant speed.

Then go through every row in a real browser (`verify`): a screenshot shows one state, never the change between them.

## Transitions: which spring Framer keeps

- Framer keeps `spring-physics <stiffness> <damping> <mass> <delay>` only on scroll transforms
  (`styleTransformEffect`) and page transitions (`pageEffects`). Everywhere else (variants, appear, hover, press,
  loop, flow, text effects, overlays) it keeps only time springs (`spring-duration <time> <bounce> <delay>`) and
  silently turns a written `spring-physics` into its own spring with bounce 0.2, or 0s on an overlay's backdrop.
  `design_apply` writes each spring as the kind Framer keeps there and lists the transitions it rewrote: tell the user
  which ones to switch to Physics in the editor if they want physics there (`dsl`, Springs).
- A physics spring has no bounce when damping = 2·√(stiffness·mass). More damping than that does not calm it, it
  makes it creep.
- Framer's Reduced Motion setting keeps only opacity for visitors who ask for it, and only when it is on. It is off by
  default; it is turned on with `design_apply` xml `<RootNode id="rootNode" metadata.reducedMotion="true" />`
  (`site_settings_set` does not take it). Transforms then stay at the layer's position on the canvas, so the canvas
  layout is what those visitors see. "The ticker or appear does nothing" reports usually come from this setting or Low
  Power Mode.
- WCAG 2.2.2 asks for a way to pause anything that moves on its own for more than 5 seconds. A pause without code: the
  moving part goes in a component with a `Paused` variant that overrides `tickerEffect.velocity="0"` (a shader:
  `$control__speed="0"`), toggled by a button with `onTap` `SET_VARIANT` `cycle` and an `ariaLabel`
  (`tickerEffect.hoverModifier="0"` pauses on hover only, which touch screens and keyboards cannot use).

## Effects in one call

`effects_set` writes the common effects with every value spelled out: fade-up, hero-sequence, text-reveal,
hover-lift, hover-fade, press, float, pulse, spin, scroll-grow, parallax, ticker. Pass the values the design asks for.

- An effect that starts from opacity 0 on the largest element of the first screen (the LCP element) delays Chrome's
  LCP: Chrome ignores opacity-0 paints. Move that layer with `y` only, or leave it still.
- A CMS list staggers its items with `appearEffect.enter.stagger` on the list (`dsl`, CMS lists): every item is the
  same layer, so growing delays are impossible.

## Scroll mechanics without code

How Framer builds common scroll mechanics without WebGL:

- a transformation in a pinned stage: a component with a variant per state, switched by `scrollVariantEffect` (A pinned
  step section, below), or a crossfade between two images;
- panels that stack as the page scrolls: each `position="sticky"` with a growing `positionStickyTop`; to scale the one
  underneath, a `styleTransformEffect` `onScrollTarget` with `viewport="end"` whose target is the next panel
  (`elementId`, `scrollTargetEnabled`). Each panel needs one opaque root (`layout`, Items made of two pieces), or the
  one under it shows through. A panel taller than the screen can never be read while sticky: `position="relative"` on
  its copy on that breakpoint;
- text assembling word by word: `textEffect` by word (`effects_set` `text-reveal`);
- a color per chapter: full-height sticky panels, each with its own fill;
- live values (clocks, counters, scroll speed): a small code component or override (code, so only when the user
  allows it);
- a 3D object turning: a pre-rendered video loop or image sequence; an embed only when interaction matters;
- a graphic transition between sections: a full-width image or video layer, or a masked reveal;
- parallax on an image: a `styleTransformEffect` y inside a clipped frame (`effects_set` `parallax`);
- a horizontal gallery moved by the vertical scroll (below).

## Hover

- A hover variant copies the base variant's transition, delays included: set the hover's own.
- Write `hoverEffect.scale` whenever a `hoverEffect` is written: Framer fills in 1.1 by itself (`dsl`, Motion).
- A label that changes width on hover shifts the layout around it. To bring in an element without a shift (an arrow
  after a label): an `Arrow` frame with `overflow="clip"`, `width="0px"` and `stackDistribution="end"` holds it; the
  hover variant sets the frame's width and reduces the button's side padding by half that width on each side, so the
  button keeps its width.
- Phones have no hover: content or actions shown only on hover need a tap or an always-visible equivalent.

## Appear needs a visible layer

- An `appearEffect` plays when its own layer comes into view, measured with its start state applied. A layer that the
  start state moves fully out of a clipped parent (a bar at `x -720` inside an `overflow="clip"` track) is never in
  view, so it never plays and stays hidden on the site. One that keeps a visible edge does play, which hides the
  problem on wide screens. Put the effect on the visible parent (the track) instead.
- The end of the page is the same trap: a layer in the last block whose start offset pushes it under a clipped edge,
  or whose threshold the page's end cannot reach, never plays on the breakpoints where it sits lowest. Reveal such a
  layer with opacity only, and scroll every page to its end on every breakpoint.

## Scroll transforms: the start state

- A new `styleTransformEffect` starts from Framer's preset, whose first section already has `opacity: 0.5` and
  `scale: 0.5`. Writing only `x` or `y` leaves the layer half transparent and half size at the start. Write `opacity`
  and `scale` in every section, and read the effect back (`effects_set` `scroll-grow` and `parallax` write both
  sections whole). Scaling left-aligned text scales it from its center, so the line drifts sideways.
- Values inside the sections go without quotes in raw DSL (`styleTransformEffect.sections.0.opacity=0.15`);
  `design_apply` xml writes a JSON list that way by itself. `styleTransformEffect=null` removes the effect.
- `viewport` applies only to `onScrollTarget` (start by default). `onInView` runs from the layer's top entering at the
  bottom of the window until its bottom reaches the bottom of the window, then stops, so an `onInView` parallax moves
  only while the layer comes in. `onScroll` spans the whole page, 0 at the top and 1 at the bottom.
- `onScrollTarget` interpolates, it does not switch: the value follows the scroll linearly from the previous state to
  each target's state while the target passes the viewport line, and the transition only smooths it. A continuous
  change (a progress arc, a bar) needs one target over the whole range, not a ladder of small ones.
- `x` and `y` in the sections take px only (`-100%` is refused), and there is no `scaleX`: a bar or track that moves by
  its own width needs a px travel per breakpoint. A breakpoint copy takes its own `styleTransformEffect` (another `x`,
  or `"null"` to drop it there).

## A header that reacts to scroll

- A header that hides on scroll down cannot be built through the DSL. `scrollVariantEffect` `onScrollDirection` drops
  `fromVariant`, `toVariant` and `sections.0.variant` without an error; `appearEffect` `onScrollDirection` keeps
  `enter` and `exit` but no direction (`appearEffect.direction` is accepted and dropped), and Framer's runtime skips
  it. Do not promise it: it needs a code override.
- A header that changes after a section works: a header component with two variants (for example `Top` and
  `Scrolled`); the instance on the page gets `position="sticky"` at `index="0"`,
  `scrollVariantEffect.trigger="onScrollTarget"`, `sections.0.variant` = the first variant's id, `sections.1.target` =
  the section after which it changes (`elementId`, `scrollTargetEnabled="true"`) or an invisible trigger frame there,
  and `sections.1.variant` = the second variant's id, written when the instance is created. The switch animates with
  the component's variant `transition`; check it in Preview.

## A pinned step section (scroll scene)

The section stays on screen while the page scrolls, and its content changes step by step: a list whose active item
follows the scroll, images that swap, a counter. Build it this way, not with separate effects on every layer.

1. **One component holds every step.** A component with variants `Step 1` … `Step N`, each a whole composition of the
   screen. Whatever changes between steps changes between its variants: things that swap sit on top of each other
   inside it, the current one shown and the others hidden (opacity 0, plus any offset or scale the design asks for);
   a list's active item is a nested component (Tabs, below) whose variant each step sets; the variants' `transition`
   is the scene's motion.
2. **The section:** `overflow="visible"` or `"clip"`, never `"hidden"`: hidden stops sticky anywhere inside it. No
   `zIndex` on the section. A background that should scroll under the stage is an absolute frame (z0, pinned to all
   sides).
3. **The stage:** the section's first child after the background, transparent, a `zIndex` above it,
   `position="sticky"`, `positionStickyTop="0px"`, `height="100vh"`. In it, one instance of the component, absolute,
   `width="100%"`, `height="100%"`, with `scrollVariantEffect.trigger="onScrollTarget"`, `threshold="0.5"`, and
   sections: `sections.0.variant` = Step 1 (no target), then `sections.<i>.target` = the preview of step i+1 and
   `sections.<i>.variant` = its variant id.
4. **Step Previews:** after the stage, a frame of instances of Steps 2…N, `height="100vh"` each, every one with
   `elementId` and `scrollTargetEnabled="true"`. They give the section its height, show every step in the editor and are
   the scroll targets. Hide them on the site with a `styleTransformEffect` on the previews frame
   (`trigger="onScrollTarget"`, `sections.0.opacity="0"`, `sections.1.opacity="0"`, `sections.1.target` = the frame
   itself), which needs `elementId` and `scrollTargetEnabled="true"` on that frame too, and `pointerEvents="none"`.
   Read the sections back: they must hold opacity only. A `scale` or offset there (a new effect's preset brings
   `scale 0.5`) shrinks the invisible track, so every target sits somewhere else on screen than in the layout: steps
   switch at the wrong scroll, and code that measures them (`getBoundingClientRect`) gets wrong positions. Reset it
   with `sections.0.scale="1"`; `null` is refused.
   Opacity 0 and `pointerEvents="none"` hide the previews from the eye and the mouse, not from screen readers or the
   Tab key. Put the step's links and buttons behind a boolean variable that the previews turn off.
5. **Clicks:** each list item links to its step: `/#<section id>` for the first, `/#<preview id>` for the rest.
6. **Without the pin on a breakpoint:** the stage `position="relative"` on its copy, its instance
   `scrollVariantEffect="null"`, and the previews frame `styleTransformEffect="null"`, so step 1 and the previews read
   as a stack. Where the scene stays pinned on a phone, content in the bottom 15% of the stage can be covered: Framer
   has no `svh`/`dvh`, and on iOS Safari `100vh` is taller than the visible area while the toolbar shows.

Pitfalls:

- `scrollVariantEffect` switches when a target's top crosses threshold × the window height (0.5 = the middle) and
  keeps the last target's variant after it.
- `scrollVariantEffect` sections are written only when the instance is created: a `SET` of them on an existing
  instance changes nothing. To change the steps, delete the instance and create it again with the new sections.
- Variants are named in sections by their id, not their name (read the component's variant frames).
- `nodes_read` may show temporary names in the sections; the site uses the real ids.

## A horizontal gallery moved by scroll

- The section holds a sticky `Stage` (`height="100vh"`, `overflow="clip"`) with a horizontal stack `Track`, then,
  right after the stage, a `Timeline` frame (`elementId`, `scrollTargetEnabled="true"`, `pointerEvents="none"`) as
  tall as the travel (track width minus window width), for 1:1 speed. The Track gets
  `styleTransformEffect.trigger="onScrollTarget"`, `viewport="end"`, `sections.0.x="0px"`, `sections.1.target` = the
  Timeline and `sections.1.x="-<travel>px"`, opacity and scale 1 in both, and a transition. A target right after a
  100vh stage with `viewport` end starts when the section reaches the top, so its height is the pin length.
- Each breakpoint copy gets its own travel (another `x` and Timeline height). For a native swipe on a breakpoint: the
  Track copy's `styleTransformEffect="null"`, the stage's copy `position="relative"` and `overflow="auto"`, the
  Timeline hidden.

## Tabs and other two-state items

- An item with an active and an inactive look is a component with `Active` and `Inactive` variants; its link is a
  property (Links on components, below).
- **A bar that grows or shrinks: move it, do not size or scale it.** Framer snaps a height that goes to 0 instead of
  animating it, and `scale` is uniform (there is no `scaleX`), so a bar that grows by scale also gets thinner while it
  moves. Put the bar, at its full size, in a `Track`: absolute, pinned `top` and `bottom`, the bar's width,
  `overflow="clip"`. The bar keeps its size in both states: `top="0px"` when active, `top="-<height>"` when inactive,
  so it slides out of the track and back (`x` for a horizontal bar).
- **Who sets the transition.** A nested instance whose variant the parent's variant sets animates with the parent's
  transition; its own variants' transitions, delays included, are ignored. Set `transition` on the nested instances
  in each parent variant instead (any layer inside a component can carry one, and its children inherit it).
- **One item leaves, then the next arrives:** in each parent variant, the instance that becomes active gets a delay
  about as long as the leaving transition takes, the others none. Scrolling back works the same way, since each
  variant carries its own.

## Before/after compare without code

- A component with variants Split 10…90 whose root is a horizontal stack, gap 0, `overflow="clip"`. Before: width 50%
  (changed per variant), the image fill with `fillImagePositionX="left"`. After: `width="1fr"`, the same image with
  `fillImagePositionX="right"`. Crop the image to the root's exact aspect, so both halves render at one scale and the
  seam disappears; put `aspectRatio` on the instance. On top, a Zones layer of five transparent frames: zone i sets
  Split i on `onMouseEnter` and on `onTap`. `dragEffect` cannot drive it: a drag only moves the layer and fires no
  event, so it changes no variant or variable. Check the scrub in Preview.

## Page transitions

- `pageEffects` on a page's primary breakpoint: `pageEffects.all.*` for every page (on the home page), or
  `pageEffects.<other page id>.enter.*` / `.exit.*` for one pair. Available: opacity, `y`, `scale`, an iris
  (`enter.mask.type="circle"` with `mask.x` and `mask.y`) and a wipe (`mask.type="wipe"` with `mask.angle`). Only
  physics springs stay there (`design_apply` converts).
- Which page's effect plays in which direction is not documented: check both directions in Preview. Set every page
  breakpoint's fill (a template's breakpoints on pages that use one): it shows during the transition. Page Effects run
  on View Transitions, so check the published site in Safari and Firefox.

## Links on components

- A link on a component instance is a property of the component, never a frame wrapped around the instance. Add a
  link variable to the component and bind it to the root's link:
  `+LinkVariable <id> name="Link" scope="<component id>"; SET <primary variant id> link.href="var(--variable-<id>)";`
  then set it on each instance: `$control__link="/#step-2"` (read the exact control name with `components_read`).
- `link.href` works on frames and text only; `link=` without `.href` is refused.
