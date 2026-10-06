# Components

## Structure

- **Anything that repeats becomes a component.** Use folders the way a React codebase would: `Buttons & Links/Button`,
  `Navigation/Header`, `Content/FAQ Item`, `Brand/Logo`.
- **Create:** `+ComponentNode btn name="Buttons & Links/Button"; +FrameNode btnPrimary parent="btn" name="Primary" …;`
  The first `FrameNode` is the primary variant.
- **More variants:** `CREATE_VARIANT btnSecondary from="btnPrimary"; SET btnSecondary name="Secondary";`
  - Override a variant's descendant with the compound id `<variant id><node id>`.
  - Temp-plus-temp compounds work inside one batch.
- **A variant made `from` another variant** (Phone Open from Phone) copies that variant's overrides as they are at that
  moment and does not follow later changes to it: finish the source first. Changes to the primary keep reaching every
  variant without its own override, so wire shared actions (clicks, an autoplay `onAppear`) once on the primary after
  the `CREATE_VARIANT`s.
- **Give each new variant `left` and `top`:** with auto width it lands on top of the primary on the canvas.
- **Hover and pressed:** `CREATE_VARIANT btnHover from="btnPrimary" gesture="hover";`
  - Place it below its source with `top`.
  - Override only what changes.
- **Transitions:** give every variant of a component the same `transition`. The default,
  `spring-duration 0.4s 0.2 0s`, bounces: replace it with a time spring without bounce. Hover and pressed variants
  copy the base variant's transition, delay included: set theirs back to a quick spring without delay
  (`spring-duration 0.3s 0 0s`). A nested instance whose variant the parent sets animates with the parent's transition
  and ignores its own variants' transitions: set `transition` on the nested instance in each parent variant.
- **No fill on a variant:** `fill="null"`.

## Practices that keep components easy to use (Practice)

- **Primary first.** Make every structural change in the primary variant before customizing the others: variants
  inherit from it.
- **Same layers in every variant.** Keep layer names and structure aligned across variants; Framer animates between
  matching layers (position, size, opacity). Change what a variant shows with opacity and size, not by adding layers.
- **Interactions on the primary.** Wire clicks and hovers on the primary variant so they apply to every state; override
  only where a variant must behave differently (for example the menu button's target in Phone and Phone Open).
- **Breakpoint variants named `Desktop`, `Tablet`, `Phone`.** Framer then picks the right one per breakpoint, and
  instances on the page's breakpoints set `$control__variant` to the matching name.
- **A Marketplace smart component on a breakpoint copy** ignores `$control__variant="<name>"` without an error (lint:
  "Component variant does not match its breakpoint"). Set the variant through that copy's plugin controls
  (`{ ...node.controls, variant: "Phone" }`) and read it back. Project components switch through the DSL as usual.
- **Sizes that survive any parent:** sensible defaults plus `minWidth` / `maxWidth` on the root, `width="1fr"` or
  `auto` rather than fixed px.
- **Controls for everything people edit:** text, image, link, icon, toggles for optional parts (`visible` bound to a
  boolean variable). Name them in plain words ("Title", "Show icon").
- **Small, combinable pieces:** buttons, badges, cards and list items as their own components, composed into
  sections. A change to the button then updates every card.
- **States:** interactive components get hover and pressed gesture variants, plus disabled or loading where it applies
  (forms: Default, Pending, Success; see [cms-forms.md](cms-forms.md)).

## Cards of two pieces

- **A text panel and a photo side by side make one solid card:** the root gets the card fill, the radius,
  `overflow="clip"`, `padding="0px"`, `gap="0px"`; the photo runs to the edges without its own radius. A transparent gap
  between the pieces shows what is behind them: the card under it in a sticky stack, the next slide in a carousel.
- **A phone variant instead of a squeezed card:** a testimonial gets a `Compact` variant (`CREATE_VARIANT <tmp>
  from="<primary variant id>";` then `SET <tmp> name="Compact"`): quote, name and role, the photo hidden, 24px
  padding, the quote one style smaller. The phone slides use it.

## Variables are controls

- **Create and bind:** `+Variable label name="Label" type="string" initialValue="Get started" scope="btn";`, then bind
  it with `text="var(--variable-label)"`. Variables also drive `visible`, `link.href` and an IconNode's
  `$control__icon`.
- **A link property:** `+LinkVariable link name="Link" scope="<component id>"; SET <primary variant id>
  link.href="var(--variable-link)";` (one batch works), then `$control__link="/#faq"` on each instance. Never wrap an
  instance in a frame to link it.
- **Order:** declare a variable before its first use in the batch.
- **Variable ids are not in `renamedIds`.** Before referencing a new variable from another batch, read the component
  (`serialize` its scope) to get the real id.
- **`+IconVariable` with `initialValue` fails** ("could not be prepared as a variable"). Create it without the value,
  then `SET <variable id> initialValue="Shopping Bag"`.
- **A batch of only `SET <variable id>` in a fresh session fails** with "target does not exist" until the component
  has been read. Serialize the component first.
- **Instances:**
  `+ComponentInstanceNode cta parent="…" component="<component id>" $control__variant="<variant name>" $control__<name>="…";`
  - Get the exact control names from `framer.agent.readComponentControls({ componentIds: [id] })`.
  - `$control__variant` takes the variant's current name ("Slide 3"). `SET_VARIANT`'s `controls.variant` and
    `scrollVariantEffect` sections take its id. `readComponentControls` can still list the old name of a renamed
    variant ("Variant 3"), which Framer refuses: take variant names and ids from `serialize` of the component.
  - Names are camelCase, like `$control__showIcon`. Do not derive them from the variable name.
  - **One invalid `$control__` value drops every `$control__` of that command**, and the error names only the invalid
    one (a link to an anchor that does not exist yet takes the title with it). Put each risky control (an anchor link,
    a variant) in a `SET` of its own, and read the instance back after any error on it.

## Interactions

- **Click to switch variant** (accordion, tabs, menu): on a node inside the component, set
  `onTap.0.action="SET_VARIANT" onTap.0.controls.variant="<variant id>"`, or `"cycle"` for two variants.
- **A component instance takes no `onTap`** ("Cannot apply onTap"). Give the component `+EventHandlerVariable click
  name="Click" scope="<component id>";`, fire it from a node inside with `onTap.0.action="TRIGGER_EVENT"
  onTap.0.controls.id="var(--variable-<event id>)"`, then set the action on the instance under the event's name:
  `onClick.0.action="SET_VARIANT"` (an event named Morning is `onMorning`). One event can run several actions:
  `onClick.0` fires the parent's own event with TRIGGER_EVENT, `onClick.1` runs SET_VARIANT. Never wrap an instance in
  a frame to make it clickable.
- **Frames that advance on their own** (a sequence, a wave): every variant gets
  `onAppear.0.action="SET_VARIANT" onAppear.0.controls.variant="cycle" onAppear.0.delay="0.12s"`.
- **Tabs:** a Tab component (Active, Inactive, hover) with a Click event, and a Tabs component with a variant per tab.
  Each nested Tab's `onClick` sets the parent's variant, and each parent variant sets its nested tabs' variants. The
  nested tabs animate with the parent's transition (see Structure), so set `transition` on them in each parent
  variant, with a delay (about 0.15s) on the one becoming active.
- **A native slider:** a variant per slide, the slides stacked with a crossfade. Dots and Previous use `SET_VARIANT` by
  id in each variant (compound ids); Next uses `cycle`. Autoplay is `onAppear.0.action="SET_VARIANT"
  onAppear.0.controls.variant="cycle" onAppear.0.delay="4s"` on the primary's root once: every variant inherits it.
  Give it a pause ([motion.md](motion.md), other effects).
- **Plus/minus icon swap:** stack two IconNodes in a wrapper without stack layout. Animate their `rotation`, `scale` and
  `opacity` in the variants.
- **`flowEffect` is forbidden inside components** ("Move the node out of scope").
- **An icon from a project vector set is ignored in an instance's icon control.** Framer drops it silently, while sets
  like Lucide work. Instead do one of these:
  - bind the icon inside the component;
  - make a variant per icon;
  - ask the user to pick the icon in the editor.

## Page state without code

- **Page variables** hold page-level state: `+Variable fleet name="Fleet" type="string" scope="<page id>"
  initialValue="All";` (`boolean` and `number` too; `queryParam` names its URL parameter).
- **Set one** from an instance event or a frame's `onTap`: `onClick.0.action="SET_VARIABLE_VALUE"
  onClick.0.controls.variable="var(--variable-<id>)" onClick.0.controls.value="Keelboat"`. Toggle a boolean with
  `onClick.0.controls.value.from="var(--variable-<id>)" onClick.0.controls.value.transforms.0.name="negate"`.
- **Follow one** with computed values: `$control__variant.from="var(--variable-<id>)"`, then transform 0 `equals`
  (value "Keelboat") and transform 1 `convertFromBoolean` (outputType `option`, truthy and falsy variant names). For many
  values, use `convertFromString` with `cases.<i>.from` / `.to` and a `default`. `visible` (outputType boolean), `text`
  (string) and `fill` (color) follow the same way; give the parent of items that hide `flowEffect.transition`.
  `textColor` cannot be computed: recolor text through component variants.
- **No arithmetic:** count with a lookup, `numberToString`, then `convertFromString` with outputType number, cases
  "1"→"2", "2"→"3" and the maximum as default.
- **A fresh session does not know page variables** ("Expected an existing variable, but it could not be found").
  Serialize the page in full before a batch that names one, and to check bindings: a read of one node hides the
  attributes bound to them.

## Framer's own components

- **Video, YouTube, Google Maps, Embed, Slideshow, Carousel, Countdown, Locale Selector, Cookie Banner, Search…** go in
  like project components: `+ComponentInstanceNode component="<id>"`, with the id from
  `framer.agent.listComponents().additional`. Read their controls first. The only map is Google Maps
  (`$control__location="Ericeira, Portugal" $control__zoom="12"`). Embed takes `$control__type="url"
  $control__uRL="https://…"`.
- **Background video:** `$control__source="Upload" $control__file="<uploaded mp4 url>" $control__loop="true"
  $control__muted="true" $control__playing="true" $control__controls="false" $control__fit="cover"
  $control__poster="true" $control__image.src="<poster url>"`, pinned `0px` on four sides with `width="100%"
  height="100%"`. Re-encode the file first (H.264, no audio, faststart, under 4 MB) and upload it with
  `framer.uploadFile`.
- **Media a state does not show still loads and plays:** in a reel or slider that switches clips by variants, every
  clip loads at once. Set `$control__playing="false"` on the clips a variant does not show, give each clip a poster
  (its first frame, so nothing flashes), and show one clip or the poster on phones.
- **Slideshow and Carousel** slots (`$control__content.<i>`) take frames that are direct children of the page, next to
  the breakpoints. A **Countdown** `$control__date` must be midnight (`T00:00:00.000Z`) while `displayTime` is false.

## Code components

Use them only when the user asks, or when the canvas cannot do the task.

- **Place:** `+ComponentInstanceNode component="<component id>"`. Take the component id from
  `framer.agent.listComponents()`, not the code file's id.
- **Apply a code override** with `codeOverride="codeFile/<file id>:<export name>"` on the layer. The full id is listed
  in `framer.agent.listComponents().project.code`; the code file's id alone is not enough. One override applies on
  every breakpoint and variant.
- **Simple controls** (string, number, enum, slots) go through the DSL.
- **A font control** takes `fontSelector` (`"GF;Fraunces-regular"`, `"GF;Bricolage Grotesque-700"`) and `fontSize`
  (`"44px"`). Its `lineHeight` and `letterSpacing` are `[value, unit]` pairs (`[1.16, "em"]`, `[-0.02, "em"]`); a CSS
  string such as `"-0.04em"` makes the whole font invalid. Write `fontSelector` together with any other font field.
- **Object controls** (a carousel's `arrows`, `dots`, `clipping`) are refused as "unsupported type object". Set them
  through the plugin API and merge with the current value yourself:

  ```js
  const node = await framer.getNode(instanceId);
  await node.setAttributes({
    controls: { ...node.controls, arrows: { ...node.controls.arrows, show: false } },
  });
  ```

- **`node.controls` keys are the component's prop names, not the `$control__` names** (a `$control__buttonGap` can be
  `arrowGap` there), and nested fields can differ from the docs (`serviceRadius` is stored as
  `radius`). An unknown key gives no error and has no effect: read `node.controls` first and write only the keys it
  has.
- **Arrays of objects in an instance** (a Repeat's items) take the same route, keyed by ids:
  `{ "<array control id>": [{ id: "…", "<field id>": "…" }] }`.
- **Images inside an array or object control** (most carousels: `slides: [{ image, caption }]`) are refused by the DSL
  ("unsupported array item type"). `setAttributes` drops an image there silently when it is a URL or the
  `{ id, url, thumbnailUrl }` object Framer reads back, and the component keeps its demo photos. Upload each image with
  `framer.uploadImage`, put the asset it returns in the array, and read `node.controls` back. A default of `[]` does
  not mean slot: check the control's type.
- **Single image and file controls take an https URL in the DSL**, and Framer uploads it: `$control__image="https://…"`
  on a code component, `$control__image.src="…" $control__image.alt="…"` on an image variable,
  `$control__videoFile="<uploaded mp4 url>"` on a file control. An image variable's `initialValue` URL is uploaded the
  same way.
- **Slots:** set `$control__<slot>.<i>="<id>"` to a layer that is a direct child of the page (a `WebPageNode` child,
  outside the breakpoints). Park slot content next to the Desktop frame.
- **Text in a slot item needs a text style without balance:** with balance, its auto-width frame measures wrong and
  ticker items overlap. Give slot labels a style of their own (`Ticker`).
- **One carousel per width.** Many carousels measure the first slide once and never resize it, and the canvas renders
  a breakpoint copy with the primary's slots. Build one instance per width with its own slides (desktop 1120, tablet
  680, phone 300 wide) and show each on its breakpoints only with `visible`.
- **A component's defaults are its author's design, not the site's:** go through every control that shapes it. Turn
  off debug aids (hit-area guides), calm loud effects (a grain overlay above about 0.12 opacity dirties text), replace
  a tween with a spring, set offsets that show slivers of other slides to 0 unless a stack is meant, size the slides
  so the next one peeks to the content edge, and give them one height.
- **Object controls on copies:** setting a carousel's object controls on the primary instance does not reach its
  breakpoint copies. Set each copy too. Read the `transition` back after setting it: a spring object can be refused
  without an error, leaving the tween default. Then ask the user to set the spring in the component's panel, and list
  it at handoff.
- **In the canvas, slot content is Framer's internal renderer**, not your component. Props that a carousel injects
  (for example `variant` for the active card) do not reach it there, only on the site. Set the cards' variants by hand
  for the canvas.
- **Layout Jump Preventer** (a Framer University component) measures its grandparent.
  - Place it first in the variant root that holds all the content; deeper, it sets the wrong height and content spills
    under the next section.
  - Keep `gap` 0 on that root and space the content with padding: the zero-size first child adds a gap.
