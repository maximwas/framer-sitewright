# Motion: scroll scenes, variants and tabs

Checked on live sites. Effects never run on the canvas or in screenshots: check them in Preview or on the published
site, and tell the user so.

## Transitions: spring physics

- Every transition is a spring with physics (`spring-physics <stiffness> <damping> <mass> <delay>`), never `tween` or a
  bezier, even when a reference copies CSS easing. No bounce: damping = 2·√(stiffness·mass). Typical: `1000 63 1` for
  hover and press (settles in 0.3s), `400 40 1` for buttons, tabs and menus (0.45s), `200 28 1` for larger moves
  (0.65s), `120 22 1` for slow scroll motion. More damping than that does not calm a spring, it makes it creep
  (`200 40 1` takes about 1s to land).
- Framer keeps `spring-physics` only on scroll transforms (`styleTransformEffect`) and page transitions (`pageEffects`).
  Everywhere else (variants, appear, hover, press, loop, flow, text effects, overlays) it keeps only time springs and
  silently turns a written `spring-physics` into its own spring with bounce 0.2, or 0s on an overlay's backdrop.
  `design_apply` therefore writes each spring as the kind Framer keeps there, the nearest without bounce, and lists
  the transitions it rewrote: tell the user which ones to switch to Physics in the editor.
- Respect reduced motion. Framer's Reduced Motion setting keeps only opacity for visitors who ask for it, but only
  when it is on: turn it on for every site with `design_apply` xml `<RootNode id="rootNode"
  metadata.reducedMotion="true" />` (`site_settings_set` does not take it). Transforms then stay at the layer's
  position on the canvas, so the canvas layout is the no-motion version: a scroll-transform signature must read at
  rest, and numbers it animates are also written as text. Check the site with the system setting on; "the ticker or
  appear does nothing" reports usually come from it or Low Power Mode.
- Anything that moves on its own for more than 5 seconds (a ticker, a shader, an autoplaying slider) needs a way to
  pause it (WCAG 2.2.2). Build that pause so it works without a mouse: the moving part goes in a component with a
  `Paused` variant that overrides `tickerEffect.velocity="0"` (a shader: `$control__speed="0"`), toggled by a button
  with `onTap` `SET_VARIANT` `cycle` and an `ariaLabel`. Pause on hover (`tickerEffect.hoverModifier="0"`) is only an
  extra. An autoplaying slider (`onAppear` `SET_VARIANT` `cycle`) gets the same pause.

## Motion menu: what to offer

Start from the concept's one motion verb (`workflow`, step 2): descend, stack, focus, stamp, assemble. Build that verb
as the signature, a scene that means something, with a phone version and a version without motion. Then the quiet
layer below. `effects_set` writes the common effects whole, with the right springs: fade-up, hero-sequence,
text-reveal, hover-lift, hover-fade, press, float, pulse, spin, scroll-grow, parallax, ticker.

Signature mechanics and how Framer builds them without WebGL:

- a transformation in a pinned stage: a component with a variant per state, switched by `scrollVariantEffect` (the
  pinned step section below), or a crossfade between two images;
- stacking cards or issues: sticky panels with a growing `positionStickyTop`;
- a manifesto assembling word by word: `textEffect` by word (`effects_set` `text-reveal`);
- color per chapter or item: full-height sticky panels, each with its own fill;
- live microcopy (clocks, scroll speed, counters) or a collectible: a small code component or override (ask first);
- a 3D object turning: a pre-rendered video loop or image sequence; an embed only when interaction matters;
- a graphic transition (dissolve, torn paper, clouds): a full-width image or video layer between sections, or a
  masked reveal.

A page with motion only in its hero reads as unfinished; motion on every element reads as noise. Offer three levels
with the effects named per section, and let the user choose.

- **Subtle:** hover and pressed states on everything clickable; one hero load sequence (heading, text, media, 0.1s
  apart), but never from opacity 0 on the LCP element: Chrome ignores opacity-0 paints, so a hero heading or main
  image that fades in from 0 records LCP late. Give that layer `y` only, or leave it still (`effects_set`
  `hero-sequence` starts from opacity 0: use it on the smaller items); accordions and menus that open by height.
- **Balanced** (the default for templates), everything above plus:
  - cards of a group appear on scroll with a stagger (`appearEffect` `onInView`, delays growing 0.06s per item), not
    every section. Cap the group: the last card starts within 0.3–0.4s of the first. In a grid use
    `min(0.05 × (row + col), 0.3)`s, or call `effects_set` once per row. A CMS list staggers with
    `appearEffect.enter.stagger` on the list (`dsl`, CMS lists);
  - images zoom slightly on hover inside a clipped frame (a hover variant of the card, image `scale` 1.05);
  - a ticker of client logos or words (`tickerEffect` on a stack);
  - one statement that appears chunk after chunk as it enters (`appearEffect` `onInView`, y 24 and opacity 0, 0.06s
    apart), not a scroll-scrubbed fade, which leaves the text faint while people read it (`sections`, Statement); a
    statement without pictures between its words reveals with `effects_set` `text-reveal`;
  - a slider of testimonials (a component with a variant per slide, arrows that `SET_VARIANT`, or a Marketplace
    carousel);
  - for agency and portfolio sites, one global page transition (Page transitions below).
- **Expressive**, everything above plus:
  - a pinned scene that changes step by step (below);
  - cards that stick and stack as the page scrolls (each `position="sticky"` with a growing `positionStickyTop`, the
    one under it scaled to 0.94 by a `styleTransformEffect` `onScrollTarget` with `viewport="end"` whose target is the
    next card (`elementId`, `scrollTargetEnabled`): a sticky target moves with the scroll and never crosses the `start`
    line). Each card needs one opaque root (`layout`, Cards made of two pieces), or the card under it shows through;
    turn sticky off on phone (`position="relative"` on the copy) when a card is taller than the screen, or its bottom
    can never be read;
  - parallax on large images (`styleTransformEffect` y inside a clipped frame);
  - a horizontal gallery moved by the vertical scroll (below).

Every one of them is a spring (see Transitions above); check them in Preview or on the published site.

- No preloader by default: a short appear sequence on the hero does a loader's work, and content is never held behind
  one. Framer's 2024 template rules allowed a preloader only when it adds to the experience; when a brief wants one,
  make it switchable.

## Hover on buttons and links

- One change per hover: a color, or a small directional cue. No second copy of the label rolling up in a clipped mask,
  no pill popping in behind a nav link, no `scale` jump: users read those as glitches.
- Nav links: the text color changes (to the accent), nothing else.
- Button with an arrow cue, no layout shift: after the label an `Arrow` frame (`overflow="clip"`, `width="0px"`,
  `stackDistribution="end"`) holds a "→" in the button style; the hover variant sets it to `22px` and the button's side
  padding 11px smaller each side (37 → 26 with an arrow of 22), so the button keeps its width and the label slides
  left as the arrow comes in. The fill stays the same.
- Nothing lives only on hover: phones have none, so content or actions shown on hover need a tap or always-visible
  equivalent, and a slider is draggable on touch. A hover effect promises a click: an image zooms on hover only inside
  a clickable card.

## Appear needs a visible layer

- An `appearEffect` plays when its own layer comes into view, measured with its start state applied. A layer that the
  start state moves fully out of a clipped parent (a bar at `x -720` inside an `overflow="clip"` track) is never in
  view, so it never plays and stays hidden on the site (seen: the after bars of a results section). A bar wide enough
  to keep a visible edge did play, which hides the problem. Put the effect on the visible parent (the track) instead.

## Scroll transforms: the start state

- A new `styleTransformEffect` starts from Framer's preset, whose first section already has `opacity: 0.5` and
  `scale: 0.5`. Writing only `x` or `y` leaves the layer half transparent and half size at the start. Write `opacity`
  and `scale` (1 unless wanted) in every section, and read the effect back (`effects_set` `scroll-grow` and `parallax`
  write both sections whole). Scaling left-aligned text scales it from its center, so the line drifts sideways.
- Values inside the sections go without quotes in raw DSL (`styleTransformEffect.sections.0.opacity=0.15`);
  `design_apply` xml writes a JSON list that way by itself. `styleTransformEffect=null` removes the effect.
- `viewport` applies only to `onScrollTarget` (start by default). `onInView` runs from the layer's top entering at the
  bottom of the window until its bottom reaches the bottom of the window, then stops, so an `onInView` parallax
  (`effects_set` `parallax`) moves only while the layer comes in. `onScroll` spans the whole page, 0 at the top and 1
  at the bottom.
- `x` and `y` in the sections take px only (`-100%` is refused), and there is no `scaleX`: a bar or track that moves by
  its own width needs a px travel per breakpoint. A breakpoint copy takes its own `styleTransformEffect` (another `x`,
  or `"null"` to drop it there).

## A header that reacts to scroll

- A header that hides on scroll down cannot be built through the DSL. `scrollVariantEffect` `onScrollDirection` drops
  `fromVariant`, `toVariant` and `sections.0.variant` without an error; `appearEffect` `onScrollDirection` keeps
  `enter` and `exit` but no direction (`appearEffect.direction` is accepted and dropped), and Framer's runtime skips
  it. Do not promise it: it needs a code override.
- A header that changes after the hero works: a header component with `Top` and `Scrolled` variants; the instance on
  the page gets `position="sticky"` at `index="0"`, `scrollVariantEffect.trigger="onScrollTarget"`,
  `sections.0.variant` = Top's id, `sections.1.target` = the first section after the hero (`elementId`,
  `scrollTargetEnabled="true"`) or an invisible trigger frame there, and `sections.1.variant` = Scrolled's id, written
  when the instance is created. The switch animates with the component's variant `transition`; check it in Preview.

## A pinned step section (scroll scene)

The section stays on screen while the page scrolls, and its content changes step by step: a list whose active item
follows the scroll, images that swap, a counter. Build it this way, not with separate effects on every layer.

1. **One component holds every step.** A component with variants `Step 1` … `Step N`, each a whole composition of the
   screen (text, images, the list). Whatever changes between steps changes between its variants:
   - things that swap (images, sentences) sit on top of each other inside it; the current one has `opacity 1`,
     `scale 1`, its normal position; the others `opacity 0`, `scale 0.96` and 24px lower (`top="24px"`,
     `bottom="-24px"` on a layer pinned to all sides), so the next one rises into place;
   - a list's active item is a nested component (see Tabs below) whose variant each step sets;
   - the variants' `transition` is the scene's motion: a spring (see Transitions above).
2. **The section:** `overflow="visible"` or `"clip"`, never `"hidden"`: hidden stops sticky anywhere inside it. Bottom
   padding where the background fades into the next section, so the pinned stage stops above the fade.
3. **The stage:** the section's first child, `position="sticky"`, `positionStickyTop="0px"`, `height="100vh"`. In it,
   one instance of the component, absolute, `width="100%"`, `height="100%"`, with
   `scrollVariantEffect.trigger="onScrollTarget"`, `threshold="0.5"`, and sections: `sections.0.variant` = Step 1 (no
   target), then `sections.<i>.target` = the preview of step i+1 and `sections.<i>.variant` = its variant id.
4. **Step Previews:** after the stage, a frame of instances of Steps 2…N, `height="100vh"` each, every one with
   `elementId` and `scrollTargetEnabled="true"`. They give the section its height, show every step in the editor and are
   the scroll targets. Hide them on the site with a `styleTransformEffect` on the previews frame
   (`trigger="onScrollTarget"`, `sections.0.opacity="0"`, `sections.1.opacity="0"`, `sections.1.target` = the frame
   itself), which needs `elementId` and `scrollTargetEnabled="true"` on that frame too, and `pointerEvents="none"`.
   Read the sections back: they must hold opacity only. A `scale` or offset there (seen: `scale 0.5`) shrinks the
   invisible track, so every target sits somewhere else on screen than in the layout: steps switch at the wrong
   scroll, and code that measures them (`getBoundingClientRect`) gets wrong positions. Reset it with
   `sections.0.scale="1"`; `null` is refused.
   Opacity 0 and `pointerEvents="none"` hide the previews from the eye and the mouse, not from screen readers or the
   Tab key. Put the step's links and buttons behind a boolean variable that the previews turn off.
5. **Clicks:** each list item links to its step: `/#<section id>` for the first, `/#<preview id>` for the rest.
6. **Phone:** unpin the scene on the Phone copies: the stage `position="relative"`, its instance
   `scrollVariantEffect="null"`, and the previews frame `styleTransformEffect="null"`, so step 1 and the previews read
   as a stack. Where the scene stays pinned, keep each step's content out of the bottom 15% of the stage: Framer has no
   `svh`/`dvh`, and on iOS Safari `100vh` is taller than the visible area while the toolbar shows.

Pitfalls:

- `scrollVariantEffect` sections are written only when the instance is created: a `SET` of them on an existing
  instance changes nothing. To change the steps, delete the instance and create it again with the new sections.
- Variants are named in sections by their id, not their name (read the component's variant frames).
- `nodes_read` may show temporary names in the sections; the site uses the real ids.

## A horizontal gallery moved by scroll

- The section holds a sticky `Stage` (`height="100vh"`, `overflow="clip"`) with a horizontal stack `Track`, then,
  right after the stage, a `Timeline` frame (`elementId`, `scrollTargetEnabled="true"`, `pointerEvents="none"`) as
  tall as the travel (track width minus window width), for 1:1 speed. The Track gets
  `styleTransformEffect.trigger="onScrollTarget"`, `viewport="end"`, `sections.0.x="0px"`, `sections.1.target` = the
  Timeline and `sections.1.x="-<travel>px"`, opacity and scale 1 in both, `spring-physics 300 35 1 0s`. A target right
  after a 100vh stage with `viewport` end starts when the section reaches the top, so its height is the pin length.
- Each breakpoint copy gets its own travel (another `x` and Timeline height). On phone: the Track copy's
  `styleTransformEffect="null"`, the stage's copy `position="relative"` and `overflow="auto"` for a native swipe, the
  Timeline hidden.

## Tabs and other two-state items

- An item with an active and an inactive look is a component with `Active` and `Inactive` variants; its link is a
  property (see Links below).
- **A bar that grows from the top: move it, do not size it.** Framer snaps a height that goes to 0 instead of animating
  it (seen on a live site). Put the bar in a `Track`: absolute, pinned `top` and `bottom`, the bar's width,
  `overflow="clip"`. The bar keeps its height in both states: `top="0px"` when active, `top="-<height>"` when
  inactive, so it slides up out of the track and back down, which reads as shrinking and growing.
- **Who sets the transition.** A nested instance whose variant the parent's variant sets animates with the parent's
  transition; its own variants' transitions, delays included, are ignored. Set `transition` on the nested instances
  in each parent variant instead (any layer inside a component can carry one, and its children inherit it).
- **One item leaves, then the next arrives:** in each parent variant, the instance that becomes active gets a delay
  about as long as the spring takes to settle (0.3s for `400 40 1`), the others none. Scrolling back works the same
  way, since each variant carries its own.
- Hover variants copy the base variant's transition: set theirs back to a quick spring without delay.

## Before/after compare without code

- A component with variants Split 10…90 whose root is a horizontal stack, gap 0, `overflow="clip"`. Before: width 50%
  (changed per variant), the image fill with `fillImagePositionX="left"` and the old-look filters. After:
  `width="1fr"`, the same image with `fillImagePositionX="right"`. Crop the image to the root's exact aspect, so both
  halves render at one scale and the seam disappears; put `aspectRatio` on the instance. On top, a Zones layer of five
  transparent frames: zone i sets Split i on `onMouseEnter` and on `onTap`. `dragEffect` cannot drive it: a drag only
  moves the layer and fires no event, so it changes no variant or variable. Seen on the canvas; check the scrub in
  Preview.

## Page transitions

- `pageEffects` on a page's primary breakpoint: `pageEffects.all.*` for every page (on the home page), or
  `pageEffects.<other page id>.enter.*` / `.exit.*` for one pair. Use opacity with a short `y` (48px) or `scale` 0.98,
  an iris (`enter.mask.type="circle"` with `mask.x="50%"` `mask.y="50%"`) or a wipe (`mask.type="wipe"` with
  `mask.angle`). Only physics springs stay there (`design_apply` converts). Content sites get a fade or a short slide
  of about 0.45s; masks are for portfolios.
- Which page's effect plays in which direction is not documented: check both directions in Preview. Set every page
  breakpoint's fill (a template's breakpoints on pages that use one): it shows during the transition. Page Effects run
  on View Transitions, so check the published site in Safari and Firefox.

## Links on components

- A link on a component instance is a property of the component, never a frame wrapped around the instance. Add a
  link variable to the component and bind it to the root's link:
  `+LinkVariable <id> name="Link" scope="<component id>"; SET <primary variant id> link.href="var(--variable-<id>)";`
  then set it on each instance: `$control__link="/#step-2"` (read the exact control name with `components_read`).
- `link.href` works on frames and text only; `link=` without `.href` is refused.
