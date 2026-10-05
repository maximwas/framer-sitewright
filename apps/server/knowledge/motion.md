# Motion: scroll scenes, variants and tabs

Checked on live sites. Effects never run on the canvas or in screenshots: check them in Preview or on the published
site, and tell the user so.

## A pinned step section (scroll scene)

The section stays on screen while the page scrolls, and its content changes step by step: a list whose active item
follows the scroll, images that swap, a counter. Build it this way, not with separate effects on every layer.

1. **One component holds every step.** A component with variants `Step 1` … `Step N`, each a whole composition of the
   screen (text, images, the list). Whatever changes between steps changes between its variants:
   - things that swap (images, sentences) sit on top of each other inside it; the current one has `opacity 1`,
     `scale 1`, its normal position; the others `opacity 0`, `scale 0.96` and 24px lower (`top="24px"`,
     `bottom="-24px"` on a layer pinned to all sides), so the next one rises into place;
   - a list's active item is a nested component (see Tabs below) whose variant each step sets;
   - the variants' `transition` is the scene's motion, e.g. `tween 0.22,0.61,0.36,1 0.8s 0s`.
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
   itself), which needs `elementId` and `scrollTargetEnabled="true"` on that frame too.
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
  as long as the duration (`tween 0.22,0.61,0.36,1 0.45s 0.45s`), the others none (`… 0.45s 0s`). Scrolling back
  works the same way, since each variant carries its own.
- Hover variants copy the base variant's transition: set theirs back to a quick one without delay.

## Links on components

- A link on a component instance is a property of the component, never a frame wrapped around the instance. Add a
  link variable to the component and bind it to the root's link:
  `+LinkVariable <id> name="Link" scope="<component id>"; SET <primary variant id> link.href="var(--variable-<id>)";`
  then set it on each instance: `$control__link="/#step-2"` (read the exact control name with `components_read`).
- `link.href` works on frames and text only; `link=` without `.href` is refused.
