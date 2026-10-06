# Writing to Framer: what the DSL does that it does not say

Read this before the first `design_apply` of a session. Framer accepts many writes without an error and still stores
something else; every rule here was seen on a live project.

## How calls reach Framer

- With the Sitewright plugin open, calls run through it and land live in the editor. The DSL (`design_apply`,
  `nodes_read`), screenshots and catalogs go through the Server API of the same project.
- Without a Server API key (`framer_status` shows it), `design_apply` and `nodes_read` work through the Plugin API:
  XML only. They create `FrameNode` and `RichTextNode` with plain text and set layout, size, position, fill (a color,
  a token, an image URL, which is uploaded, or a linear-gradient), radius, border, link and `textStylePreset`.
  Effects, transitions, variants, components, `textColor` and type on a text node, rich text blocks, shadows and
  radial or conic gradients need a key: a batch that asks for them changes nothing and says so. Color text through
  its text style there. New nodes need `parent="<id>"`. Breakpoints work without a key: `breakpoints_add`, then
  overrides on their copies.
- The Server API session keeps the project as it was when it connected. After people change it in the editor (vector
  sets, uploaded fonts, edits), call `framer_connect { reconnect: true }`.

## Batches

- Framer applies every command it can. A create (a new element in xml, a `+` command in dsl) that comes back in
  `errors` usually still made its node, sometimes with none of its attributes (a `+RichTextNode` with a refused
  `paddingBottom` came out without its text style). Read the failed targets back with `nodes_read` and fix them with
  `SET` on their real ids from `renamedIds` and `keys`; send failed `SET`s again, fixed. Sending a create again, or the
  whole batch, makes a second node.
- One invalid `$control__` value on an instance drops every `$control__` of that command, and the error names only
  the invalid one. Read the instance back after an error on it, or set a risky control (a link to an anchor) in a
  command of its own.
- A `var(--token-<id>)` of a token that does not exist is accepted without an error: take ids from
  `color_tokens_list`.
- A temp id works only inside its batch: `design_apply` sends the temp ids a batch creates under names of its own
  (every agent on a project shares one Server API session, where another agent's `q2` would answer) and answers with
  your names in `renamedIds`. In later batches use the real ids from `renamedIds` and `keys`.

## Design system

- `color_tokens_*` and `text_styles_*`; `fonts_search` for Framer's families, `fonts_discover` for Google Fonts and
  Fontshare.
- A "/" in a style or component name makes a folder (`name="Content/Card"`). Group components by role (Brand,
  Navigation, Controls, Content); keep style names flat unless the user wants folders. A folder has no API of its own:
  it disappears with its last item, so empty it with the `folders` option of the delete tools.
- When the DSL refuses a library family that `fonts_search` lists ("No available font variant"), set the font with
  `text_styles_upsert` `via: "plugin-api"`. Fonts uploaded to the project go through the DSL; Framer swaps a weight
  the project lacks without an error, and `text_styles_upsert` lists those styles in `fontFallbacks`: tell the user
  which weight to upload.
- Text style breakpoints are slots, not widths: medium, small, extraSmall in order (the tool adds skipped ones),
  starting at the page breakpoints from the top, the narrowest at 0.
- Color text with a token on the `RichTextNode` itself, `textColor="var(--token-<id>)"`, not only through its text
  style: only then does the token show in Framer's Color field (needs a key). Setting `textStylePreset` later drops the
  node's `textColor` without an error: write both in the same element or `SET`.
- Dark token values apply only through the visitor's system theme (`prefers-color-scheme`): Framer has no theme switch
  and no action that changes it. A switch needs a code override that writes the token values on `document.body` (code,
  so only when the user asks). `node_screenshot` shows the light theme only: check dark with `reference_screenshot`
  `theme: "dark"` of the published site.

## Pages and layers

- Read `framer_docs` ("Updating the Project") for node types and attributes. Read with `nodes_read` (XML), write with
  `design_apply` xml. Pass `pagePath` for a node that is not on the home page: `nodes_find` and `selection_get` say
  which page it is on.
- New nodes go last in their parent unless `index` is given.
- Fixed and absolute layers take px or % sizes, never fr; pins (`left`, `right`, `top`, `bottom`) take px only.
- Whole numbers in px (sizes, pins, gaps, padding), gradient percentages and fr weights: round 569.15px to 569px, and
  pick an `aspectRatio` whose height × ratio comes out whole.
- To stretch an absolute layer over its parent, pin all four sides to 0px instead of width and height 100%; never
  auto there, it collapses. To centre one, give `centerAnchorX="50%"` (or `centerAnchorY`) and no pins on that axis:
  `design_apply` creates it pinned and then unpins it.
- A link to `/#id` needs the target section to have `elementId` and `scrollTargetEnabled` first. Without it the call
  errors, but the node keeps the link cut to the page path (no `#id`), which `links_check` does not flag: set it again
  once the target exists (build navigation last).
- A section link needs two more things than its target, or it jumps and hides the heading (seen on a template,
  06.10.2026): `link.smoothScroll="true"` on every frame that carries a link to `#id`, inside components too (the
  button and nav link variants: the instance's link control does not carry it), and `scrollMarginTop` on each target
  section, the sticky header's height plus a gap minus the section's top padding (header 84px, padding 40px:
  `scrollMarginTop="76px"`), with its own value on breakpoints where the header or padding differ. Component changes
  after a publish reach the live site only with the next publish, and `publish_status` lists only changed pages.
- External links start with `https://`: `link.href="www.example.com"` is stored as is, without a warning, and becomes
  the relative path `/www.example.com`. `links_check` does not catch it.
- Site and page settings: read them with `site_settings_get` and change them with `site_settings_set`, which writes
  the attributes below quoted and journaled. In raw XML: `<RootNode id="rootNode" metadata.title="…"
  metadata.description="…" metadata.favicon="…" metadata.faviconDark="…" metadata.appleTouchIcon="…"
  metadata.socialImage="…" />`; a page: `<WebPageNode id="<page id>" metadata.title="…" metadata.description="…"
  metadata.socialImage="…" />`. Favicons live only on the site, `noIndex` only on pages. Framer downloads any https
  image URL there itself; when one does not answer, the call fails but everything else in the batch is applied.
- `metadata.noIndex="true"` also turns `noIndexSite` on (out of the site's own search), and `noIndex="false"` leaves it
  on: set both.

## Breakpoints

- A page is a primary breakpoint frame plus copies (replicas): add them with `breakpoints_add` (Tablet 810, Phone 390;
  with a key `CREATE_VARIANT` works too) before giving text styles breakpoint sizes.
- `$rect` in `nodes_read` can be stale (a primary just set to 1440 read 1200×1080) and is missing on nodes inside
  stacks: judge sizes from screenshots. After widening the primary, `breakpoints_add` placed Tablet from the old width,
  on top of Desktop. When the lint says "Ground nodes overlap each other", set the copies' `left` (1540, 2450…).
- Build and delete layers in the primary breakpoint only. Adapt a breakpoint by overriding its copy of a node, by the
  compound id `<breakpoint id><node id>` (real ids, not temp ids from the same batch). A copy takes overrides only: no
  new layers inside it; a layer that should not show there gets `visible="false"` on its copy.
- A different order on a breakpoint: a `MOVE` of a copy is accepted and `nodes_read` shows it, but the breakpoint was
  seen to keep the primary's order. Add a second layer at the new position in the primary, hidden there and shown on
  that breakpoint, and hide the original on that breakpoint. Check it with `node_screenshot`.
- Breakpoints take only `flowEffect` and `pageEffects`. `layout_audit` reports what a narrow breakpoint kept from
  desktop (narrow-* findings).
- `breakpoints_add` works on pages only. A layout template gets its breakpoints with `design_apply` dsl (`layout`,
  Breakpoints).

## Silent pitfalls

- An attribute name Framer does not know is accepted and ignored, and the batch still reports "applied cleanly":
  `borderRadius="999px"` left the corners square, because the name is `radius`. Effect fields too
  (`appearEffect.direction`, `scrollVariantEffect.variant`). Copy attribute names from `nodes_read` of a similar node
  or from `framer_docs`, never from CSS, and read effects back with `nodes_read`.
- Setting `text` on a variant or breakpoint copy of styled text drops its text style: repeat `textStylePreset` in the
  same `SET`.
- On a variant copy of text bound to a variable (`text="var(--variable-…)"`), the first `text` you write stores the
  variable's name ("Title") without an error. The same write sent again stores the text. Write it twice, then read the
  copy back with `nodes_read`.
- A wrapping stack with width auto collapses to one column; `aspectRatio` needs a px height, not auto.
- Text gets curly quotes and … automatically: write code samples without quotes.
- Grid rows: `gridRowHeightType="auto"` makes every row as tall as the tallest, so cells with height 1fr fill
  multi-column rows. On a breakpoint where the grid is one column switch to `fit`, or short cells leave empty bands;
  `fit` in multi-column rows shows the grid's fill under short cells.
- Stacks have no stretch alignment: a child with height 1fr in a horizontal stack of height auto stretches to its
  tallest sibling, which gives equal-height columns.
- `space-between` ignores `gap`, Framer refuses a gap with it, and its lint then asks for a gap. Use
  `stackDistribution="start"` with a 1fr spacer child and the gap you want.
- To drop a side border on a breakpoint, make it transparent; width 0 leaves an incomplete border.
- Effects and `scale` are refused on a variant or breakpoint root: use a hover or pressed gesture variant, or put them
  on a child.
- A layer's own rotation adds to the rotate of its `styleTransformEffect` states: subtract it from the states.

## Components and interactions

- `+ComponentNode` with a `FrameNode` as its primary variant; `+Variable` with `scope=<component id>` becomes a control,
  bound with `text="var(--variable-<id>)"`. In XML, `<Variable key="label" name="Label" type="string" scope="@btn"
  initialValue="…"/>` returns the variable's real id in `keys`.
- Read exact control names with `components_read` before setting `$control__*` on instances: names are camelCase
  (`$control__showBadge`; "CTA" is `$control__cTA`).
- A code component's object controls (arrows, dots, clipping) and lists go through `component_controls_set`; it
  uploads image URLs in image fields itself (a carousel's `slides: [{ image: "<url>" }]`). A single image or file
  control takes a URL straight in `design_apply` (`$control__image="https://…"`, `$control__videoFile="…"`): Framer
  uploads it. A slot takes `$control__<slot>.<i>="<id>"` of a layer that is a direct child of the page.
- More variants: `CREATE_VARIANT`; hover and pressed states: `CREATE_VARIANT gesture="hover"`. A variant created from a
  copy copies its state at that moment: finish the source variant's overrides first.
- A click that switches a variant (accordions, menus, tabs): `onTap.0.action="SET_VARIANT"`
  `onTap.0.controls.variant="<variant id>"` (or `"cycle"` for two variants) on a node inside the component.
- A component instance takes no `onTap`. Give its component a `+EventHandlerVariable` (scope = the component; in XML
  `<EventHandlerVariable key="click" name="Click" scope="@card"/>`, not `<Variable type=…>`), fire it
  from a node inside with `onTap.0.action="TRIGGER_EVENT"` `onTap.0.controls.id="var(--variable-<id>)"`, then set the
  instance's action on that event: `onClick.0.action="SET_VARIANT"` (or `SHOW_OVERLAY`, a link…). `components_read`
  shows the event's key. Never wrap an instance in a frame to link it or make it clickable.
- An autoplaying carousel: `onAppear.0.action="SET_VARIANT"` `onAppear.0.controls.variant="cycle"` with a delay on the
  primary variant's root; every variant inherits it.

## Page state without code: variables and clicks

- A page variable, a click that sets it and computed values that read it give page-level state with no code:
  `<Variable key="fleet" name="Fleet" type="string" scope="<page id>" initialValue="All" queryParam="fleet"/>`.
  `design_apply` loads the page's variables before each batch; `nodes_read` by a node's id may still hide attributes
  bound to them, so read the page root to check.
- Set it from an instance event: `onClick.0.action="SET_VARIABLE_VALUE"` `onClick.0.controls.variable="var(--variable-<id>)"`
  `onClick.0.controls.value="Keelboat"`. Toggle a boolean: `onClick.0.controls.value.from="var(--variable-<id>)"`
  `onClick.0.controls.value.transforms.0.name="negate"`. A plain frame takes the same action on `onTap`.
- Make an instance follow it: `$control__variant.from="var(--variable-<id>)"`, then transforms `equals` (value
  "Keelboat") and `convertFromBoolean` (outputType "option", truthy and falsy variant names). Many values:
  `convertFromString` with cases and a default.
- Show and hide layers: `visible.from=…` with `convertFromString` (outputType "boolean", cases, default "false"), and
  `flowEffect.transition` on the parent so the rest glides. Text (outputType string) and fill (outputType color)
  follow too; `textColor` cannot be computed: recolor text through component variants.
- There is no arithmetic: count with a lookup (`numberToString`, then `convertFromString` to a number with cases
  "1"→"2", "2"→"3", the maximum as default).
- A nested instance can fire several actions on one event (`onClick.0` TRIGGER_EVENT for its parent's own event,
  `onClick.1` SET_VARIANT). Variants made from the primary inherit actions wired on the primary.
- A hover tooltip: `onMouseEnter` SET_VARIANT Open and `onMouseLeave` SET_VARIANT Closed with the variant ids, not
  cycle. An overlay inside a component: a `RelativeOverlayNode` under the trigger frame and `onTap.0.action="SHOW_OVERLAY"`
  `onTap.0.controls.overlay="<id>"`. Images open in Framer's lightbox: `lightboxEffect.padding`, `maxWidth`,
  `backdrop`, `transition` on the image frame.
- A component that changes with the breakpoint: override `$control__variant` on the breakpoint copy of the instance.
  `aspectRatio` goes on the instance, never on a variant root. A Marketplace smart component ignores
  `$control__variant` on a breakpoint copy without an error (lint: "Component variant does not match its breakpoint"):
  set its variant there with `component_controls_set { variant: "<name>" }` (its `notStored` may still list `variant`;
  read the copy back).

## Forms, overlays and links

- Read `framer_docs` guide "Forms" first. `formSubmitButtonId="@submit"` on the form works in the batch that creates
  the button. The button's state variants (`formButtonPendingVariant`, `formButtonSuccessVariant`,
  `formButtonErrorVariant`, `formButtonIncompleteVariant`, variant ids) go on that instance in a second
  `design_apply`. In the batch that creates the form, Framer refuses them ("The target is not the form submit button")
  and applies everything else, so send only those attributes again, on the instance's real id.
- Where a form sends is set by the user in the editor (select the form, then where it sends): no tool or DSL attribute
  reaches it. Say so at handoff and ask for a test submission on the published site.
- Radio and checkbox: `formInputIconColor` is the dot or tick, `formInputCheckedFill` the checked background. Without
  `formInputIconColor`, a thick checked border shows the browser's blue dot. A select's placeholder is a first option
  with `value=""` that is not `disabled`: a disabled one makes the browser preselect the next option, which satisfies
  `required`.
- Framer has no `fieldset`, `legend`, `role`, `aria-describedby` or focus event. Make each radio label complete on its
  own and keep long help text outside the label. Give a hover tooltip `onTap` beside `onMouseEnter` on its trigger
  (touch screens have no hover). Field errors come only from the browser and the button's Incomplete and Error
  variants, so put words there.
- A modal is a `FixedOverlayNode` under the trigger frame (`SHOW_OVERLAY` on its `onTap`), with a token in
  `backdrop.fill`, `backdrop.dismissible="true"`, `backdrop.blockScroll="true"` and `zIndex="10"`. It closes by its
  backdrop and by a visible close button (`DISMISS_OVERLAY`, `ariaLabel`).
- `onKeyDown` keeps its action but drops the key (`controls.key` is not stored): a handler without a key fires on any
  key, Tab included, so Escape cannot be wired. A lightbox closes on Escape by itself; a modal does not.
- An overlay opens only from the trigger it sits under: a `SHOW_OVERLAY` that names an overlay under another trigger
  fails ("The target must be a direct child of …"). For a second button that opens the same modal, `DUPE <overlay id>
  newId="<tmp>" parent="<second trigger id>";` in the dsl part and point its click at the copy. Keep the dialog's
  content in a component instance so the copies stay alike. DUPE rewrites a copied form's `formSubmitButtonId`; set its
  button state variants again. Screenshots of overlay content: `verify`.

## CMS lists and detail pages

- Collections, fields and items go through the `cms_*` tools; a list on the canvas is `design_apply`. Read
  `framer_docs` guide "CMS Collection Lists" (and section "CMS detail pages") before the first one. Bind fields by the
  ids `cms_collections_list` gives. A filter on a reference takes the referenced item's id from `cms_items_list`: a
  slug matches nothing, without an error.
- Pagination (`load-more`, `infinite-scroll`) adds an absolute Load More button (and a Spinner) at the list's bottom,
  over the last row: give the list a bottom padding of the button's height plus a gap. `nodes_read` does not show
  `collectionList.pagination`.
- The repeated child can be a component instance whose controls are bound to fields
  (`$control__title="var(--variable-<field id>)"`), with transforms: `toDateString` for a date, `optionToDisplayName`
  for an option, `prefix` for a lead-in ("Logged by …"), and `convertFromBoolean` with outputType `option` to pick a
  variant from a boolean field (a highlighted entry).
- An appear on a list staggers its items with `appearEffect.enter.stagger`: every item is the same layer, so growing
  delays are impossible.
- A detail page: `page_create` makes a plain page even for a path with `:`. Create it with `design_apply` dsl
  `+WebPageNode <tmp> name="<Name>" path="/<base>/:<Collection name>";`. `project_overview` then lists it as
  `/<base>/:slug`, but `design_apply` takes `pagePath` `/<base>/:<Collection name>`, and `nodes_read` finds it only by
  `nodeId`. The canvas shows the collection's first item (`cms_items_order` changes which). Rich text bound to a
  formatted-text field takes per-tag presets whose text style has that tag: `stylePresetHeading1` takes an h1 style.

## Springs: what Framer stores

Every transition is a spring (design_guide motion), but which spring Framer keeps depends on the attribute:

- `styleTransformEffect.transition` keeps `spring-physics <stiffness> <damping> <mass> <delay>`; a `spring-duration`
  written there turns into Framer's default physics 500 60 1.
- `pageEffects` transitions keep only `spring-physics`: a `spring-duration` there is ignored.
- Every other transition (a variant's, `appearEffect`, `hoverEffect`, `tapEffect`, `loopEffect`, `flowEffect`,
  `textEffect`, overlays) keeps `spring-duration <time> <bounce> <delay>` only. A `spring-physics` written there is
  ignored on a node that has its own transition, and becomes Framer's default `spring-duration 0.4s 0.2 0s` (with
  bounce; 0s on an overlay's backdrop, 1s 0.25 on a loop) on one that has none: no error either way.
- `design_apply` writes each spring as the kind Framer keeps on that attribute: a `spring-physics` becomes the time
  spring without bounce that settles as fast (`400 40 1` → `0.45s 0`, `1000 63 1` → `0.3s 0`), a `spring-duration` on
  a scroll transform or page transition becomes physics. Its warnings list what it rewrote: tell the user which
  transitions to switch to Physics in the editor if they want physics there.
- `dragEffect.transition` takes only `inertia`.
- `tickerEffect` and `scrollVariantEffect` have no transition: one written there is accepted and dropped, even when
  `design_apply`'s warnings list it as rewritten. A ticker's speed is `velocity`; a scroll variant animates with the
  component's variant `transition`.
- On an `onMount` appear keep `spring-duration` even if Physics is set by hand: Framer restarts the opacity animation
  after hydration with Physics, and the layer vanishes for one frame when it ends.
- Read the result back with `nodes_read`.

## Motion recipes

- Before building an animated pattern read its Framer guide: `framer_docs` guide "Effects"; "FAQ" for accordions,
  "Navigations" for menus, "Overlays", "Buttons". Where those guides use an easing curve ("easing curves with a time"
  for fade-ins), write a spring without bounce instead.
- Appear: `appearEffect` `onMount` above the fold, `onInView` below it, from opacity 0 and a small y (8–24), a spring
  without bounce (`spring-duration 0.5s 0 <delay>`), delays in steps for a sequence. `appearEffect.replay="false"`
  makes `onInView` play once. An appear on a layer fully clipped in its start state never plays.
- Page transitions are `pageEffects` on a page's primary breakpoint (`design_guide` motion, Page transitions).
- Hover on surfaces: `hoverEffect.backgroundColor` or `opacity`, and always `hoverEffect.scale="1"` with it: Framer
  fills in 1.1 by itself, which jumps. Scale only when asked.
- Variant changes animate through `transition`: give every variant of a component the same one.
- A new `loopEffect` starts from Framer's preset, a full turn: always write `loopEffect.rotate="0"` (and any transform
  you do not animate) and a `loopEffect.transition`: without one Framer stores a linear `tween 0,0,1,1 1s 0s`. A spring
  eases into and out of every cycle, so a spin slows at each turn: give it a long spring (4–6s, as `effects_set` `spin`
  does) on one small mark. Keep loops rare.
- A `loopEffect` written on a variant's copy of a layer lands on the primary and in every variant. For a loop that
  shows in one state only (a loader dot), hide that layer in the other variants with `visible="false"`.
- Anything that opens (accordion, mobile menu, dropdown) must not show and hide content with `visible="false"`: that
  pops. Give the closed variant a fixed height (its header row) and `overflow="clip"`, the open variant `height="auto"`
  and `overflow="clip"`, both the same transition; swap or rotate the icon in the same variants; set
  `flowEffect.transition` on the list holding the items and on the page breakpoint (the same transition) so the
  sections below glide; fade the hidden part with opacity 0 in the closed variant; `userSelect="none"` on the
  clickable texts. To make the content appear as it opens instead, hide it with `visible="false"` in the closed
  variant and give it `appearEffect.trigger="onMount"`. Never for FAQ answers or other content people search for:
  text hidden with `visible="false"` is not indexed (Framer Help). Keep it in the closed variant, clipped at height 0
  with opacity 0.
- `textEffect` by word or character, on headings and short lines only, never on auto-fit text. Written through
  `design_apply`, a new one blurs every token by 10px: write `textEffect.style.blur="0px"` (`effects_set`
  `text-reveal` does). Its transition's delay is always stored as 0.05s; delay the effect with `textEffect.delay`.
  `trigger="onScrollTarget"` is accepted but has no target: use `onInView`. `tickerEffect` for marquees (it also runs
  a CMS collection list; give it `overflow="clip"`). Fade a ticker's edges with a mask on its clipped frame:
  `masks.0.mask="linear-gradient(90deg, rgba(0,0,0,0) 0%, rgb(0,0,0) 10%, rgb(0,0,0) 90%, rgba(0,0,0,0) 100%)"`.
- `parallaxEffect.speed` counts from the top of the page: the layer moves (speed/100 − 1) × scrollY, so at speed 85 a
  layer 7000px down sits about 1000px off its frame, and the DSL has no offset for it. Use it in the first screen
  only; further down use `effects_set` `parallax` (a `styleTransformEffect` y on the inner layer of a clipped frame).
  Either way the moving layer is larger than its frame by its travel, or its edge shows.
- Custom cursor: a small component (a "View" pill), then on the layer `customCursor.componentNodeId="<component id>"
  customCursor.follow="true" customCursor.placement="right" customCursor.alignment="center"
  customCursor.offsetX="12px" customCursor.offsetY="0px"`. Use the component's real id: a `@key` from an earlier batch
  is refused ("Expected a ComponentNode id"). Framer adds the primary variant, and `offsetY` defaults to 20px, so write
  it. Leave `customCursor.transition` unset, as Framer's guide advises. Touch screens show no cursor; check it in
  Preview.
- A scroll-pinned step section: the section (no zIndex) holds an absolute Background block z0 with its own gradient,
  then a transparent `position="sticky"` stage of 100vh (zIndex 2), then static copies of the later steps, 100vh each
  (instances of the step component, `scrollTargetEnabled` + `elementId`): they give the section its height, show every
  step in the editor and are the scroll targets. Hide the copies on the site with a `styleTransformEffect` whose states
  have opacity 0.
- `scrollVariantEffect` switches when a target's top crosses threshold × viewport height (0.5 = the middle) and keeps
  the last target's variant after it. Write its sections when the node is created: a `SET` of its sections on an
  existing node is ignored, so recreate the instance to change them.
- `styleTransformEffect` `onScrollTarget` follows the scroll linearly from the previous state to each target's state
  while the target passes the viewport line; the transition only smooths it. A continuous change (a progress arc, a
  bar) needs one target over the whole range. A new one starts from a preset with `opacity 0.5` and `scale 0.5` in its
  first section: write `sections.0.opacity` and `sections.0.scale` (1 unless wanted). List item numbers go unquoted:
  `sections.0.opacity=0.15`.

## Assets

- Icons: `icons_search`, then `+IconNode set="<set id>" $control__icon="<exact name>"`. A Phosphor icon is an outline
  until `$control__alpha="1"` fills it (rating stars).
- Photos: `images_search`, then `fill="<url>"` with `altText`. Own files: `image_upload`, videos, PDFs and fonts:
  `file_upload`.
- Logos and own icons are vectors: `svg_add` through the plugin (parentId places it). To reuse one across the site, ask
  the user to add it to a project vector set (the API cannot), then place it as an `IconNode` of that set. An icon from
  a project vector set given to an instance's icon control is ignored by Framer (design_apply warns): bind it inside
  the component, or give the component a variant per icon.
- An `svg_add` layer keeps its paths' bounds, not the viewBox (an icon loses its inner padding), and takes no `width`.
  A vector that must scale with its column (a chart, a wide wordmark) goes in as an image instead: `image_upload` the
  SVG markup and use it as the `fill` of a frame with `width="1fr"` and `aspectRatio`.

## Framer's own components and shaders

- Framer's own components (Video, YouTube, Google Maps, Embed, Slideshow, Carousel, Countdown, Locale Selector, Cookie
  Banner, Search…) are placed with `<ComponentInstanceNode component="<id>">` like the project's: take the id from
  `components_read`'s `framer` list and read its controls first (`components_read` with that id).
- Video as a background: `$control__source="Upload"` `$control__file="<file_upload url>"`, loop, muted, playing,
  `fit` cover and a poster image, pinned to all sides with width and height 100%. Re-encode it first (H.264, no audio,
  faststart, under 4 MB). In a reel that switches clips by variants, every clip loads and plays at once (seen: 7.6 MB
  on a phone's first load with three clips): set `$control__playing="false"` on the clips a variant does not show,
  give each clip a poster (its first frame, so nothing flashes), and show one clip or the poster on phones.
- Slideshow and Carousel slots take layers that are direct children of the page (beside the breakpoints). A Countdown
  date takes midnight only. A font control: `$control__font.fontSelector="GF;<Family>-<weight>"` and `fontSize`; one
  invalid field drops the whole font. Its `lineHeight` and `letterSpacing` are `[value, unit]` pairs (`[1.16,"em"]`),
  never a CSS string, and `fontSelector` goes in the same write as any other font field.
- Shaders (`shaders_read`): one per page, as a hero or section background: an absolute Background frame with the
  `ShaderNode` pinned to all sides and a shade above it for text. Gradient shaders take up to 8 colors: the palette's
  base and ink tones and one second hue, never the action accent; a token follows dark mode. Image shaders
  (fluted-glass and others) take `$control__texture.src` and `$control__texture.alt`; Framer re-uploads the image. The
  `shader` name cannot change through a `SET`: delete the node and add a new one.
- `codeOverride` takes a code override's full id `codeFile/<fileId>:<export>` (only while code is switched on).

## Checking

- Verify visual changes with `node_screenshot` on every breakpoint; a component is captured through its primary
  variant. The canvas and screenshots never run effects: appear, hover, loop and scroll motion show only in Preview or
  on the published site.
- Code (`custom_code_set`, `code_file_write`) only when the user asks for it or the canvas cannot do the task, and say
  why first; both stay switched off in the journal page Settings (`activity_open` gives its link) until the user turns
  them on.
- `project_overview` reports what the project's Framer plan allows; when it is limited, tell the user before using a
  feature of a higher plan.
