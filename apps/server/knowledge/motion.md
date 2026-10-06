# Motion: scroll scenes, variants and tabs

Checked on live sites. Effects never run on the canvas or in screenshots: check them in Preview or on the published
site, and tell the user so.

## Transitions: spring physics

- Every transition is a spring with physics (`spring-physics <stiffness> <damping> <mass> <delay>`), never `tween` or a
  bezier, even when a reference copies CSS easing. Typical: `400 40 1` for buttons and tabs, `200 40 1` for larger
  moves, `120 22 1` for slow scroll motion.
- Scroll transforms (`styleTransformEffect.transition`) keep `spring-physics` as written. **Variant transitions do not:**
  Framer stores a `spring-physics` written through the DSL as a time-based spring, and the Plugin API has no variant
  transition. Write the nearest time spring without bounce (`spring-duration 0.4s 0 <delay>` for `400 40 1`), read it
  back, and tell the user which variants and layers to switch to Physics in the editor.

## Motion menu: what to offer

A page with motion only in its hero reads as unfinished; motion on every element reads as noise. Offer three levels
with the effects named per section, and let the user choose.

- **Subtle:** hover and pressed states on everything clickable; one hero load sequence (heading, text, media, 0.1s
  apart); accordions and menus that open by height.
- **Balanced** (the default for templates), everything above plus:
  - cards of a group appear on scroll with a stagger (`appearEffect` `onInView`, delays growing 0.06s per item), not
    every section;
  - images zoom slightly on hover inside a clipped frame (a hover variant of the card, image `scale` 1.05);
  - a ticker of client logos or words (`tickerEffect` on a stack);
  - one statement that reveals line by line as it scrolls in (`styleTransformEffect` opacity 0.15 → 1 per line);
  - a slider of testimonials (a component with a variant per slide, arrows that `SET_VARIANT`, or a Marketplace
    carousel).
- **Expressive**, everything above plus:
  - a pinned scene that changes step by step (below);
  - cards that stick and stack as the page scrolls (each `position="sticky"` with a growing `positionStickyTop`, the
    one under it scaled to 0.94 by a scroll transform);
  - parallax on large images (`styleTransformEffect` y inside a clipped frame);
  - a horizontal gallery moved by the vertical scroll.

Every one of them is a spring (see Transitions above); check them in Preview or on the published site.

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
2. **The section:** `overflow="visible"` (a clipping parent stops sticky). Bottom padding where the background fades
   into the next section, so the pinned stage stops above the fade.
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
5. **Clicks:** each list item links to its step: `/#<section id>` for the first, `/#<preview id>` for the rest.

Pitfalls:

- `scrollVariantEffect` sections are written only when the instance is created: a `SET` of them on an existing
  instance changes nothing. To change the steps, delete the instance and create it again with the new sections.
- Variants are named in sections by their id, not their name (read the component's variant frames).
- `nodes_read` may show temporary names in the sections; the site uses the real ids.

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

## Links on components

- A link on a component instance is a property of the component, never a frame wrapped around the instance. Add a
  link variable to the component and bind it to the root's link:
  `+LinkVariable <id> name="Link" scope="<component id>"; SET <primary variant id> link.href="var(--variable-<id>)";`
  then set it on each instance: `$control__link="/#step-2"` (read the exact control name with `components_read`).
- `link.href` works on frames and text only; `link=` without `.href` is refused.
