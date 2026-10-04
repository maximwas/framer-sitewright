# Components

## Structure

- **Anything that repeats becomes a component.** Use folders the way a React codebase would: `Buttons & Links/Button`,
  `Navigation/Header`, `Content/FAQ Item`, `Brand/Logo`.
- **Create:** `+ComponentNode btn name="Buttons & Links/Button"; +FrameNode btnPrimary parent="btn" name="Primary" …;`
  The first `FrameNode` is the primary variant.
- **More variants:** `CREATE_VARIANT btnSecondary from="btnPrimary"; SET btnSecondary name="Secondary";`
  - Override a variant's descendant with the compound id `<variant id><node id>`.
  - Temp-plus-temp compounds work inside one batch.
- **Hover and pressed:** `CREATE_VARIANT btnHover from="btnPrimary" gesture="hover";`
  - Place it below its source with `top`.
  - Override only what changes.
- **Transitions:** give every variant of a component the same `transition` (the default is
  `spring-duration 0.4s 0.2 0s`).
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
- **Sizes that survive any parent:** sensible defaults plus `minWidth` / `maxWidth` on the root, `width="1fr"` or
  `auto` rather than fixed px.
- **Controls for everything people edit:** text, image, link, icon, toggles for optional parts (`visible` bound to a
  boolean variable). Name them in plain words ("Title", "Show icon").
- **Small, combinable pieces:** buttons, badges, cards and list items as their own components, composed into
  sections. A change to the button then updates every card.
- **States:** interactive components get hover and pressed gesture variants, plus disabled or loading where it applies
  (forms: Default, Pending, Success; see [cms-forms.md](cms-forms.md)).

## Variables are controls

- **Create and bind:** `+Variable label name="Label" type="string" initialValue="Get started" scope="btn";`, then bind
  it with `text="var(--variable-label)"`. Variables also drive `visible`, `link.href` and an IconNode's
  `$control__icon`.
- **Order:** declare a variable before its first use in the batch.
- **Variable ids are not in `renamedIds`.** Before referencing a new variable from another batch, read the component
  (`serialize` its scope) to get the real id.
- **`+IconVariable` with `initialValue` fails** ("could not be prepared as a variable"). Create it without the value,
  then `SET <variable id> initialValue="Shopping Bag"`.
- **A batch of only `SET <variable id>` in a fresh session fails** with "target does not exist" until the component
  has been read. Serialize the component first.
- **Instances:**
  `+ComponentInstanceNode cta parent="…" component="<component id>" $control__variant="<variant id>" $control__<name>="…";`
  - Get the exact control names from `framer.agent.readComponentControls({ componentIds: [id] })`.
  - Names are camelCase, like `$control__showIcon`. Do not derive them from the variable name.

## Interactions

- **Click to switch variant** (accordion, tabs, menu): on a node inside the component, set
  `onTap.0.action="SET_VARIANT" onTap.0.controls.variant="<variant id>"`, or `"cycle"` for two variants.
- **A component instance takes no `onTap`** ("Cannot apply onTap"). Wrap the instance in a frame and put `onTap` on the
  frame.
- **Events out of a component:** `+EventHandlerVariable`, then `TRIGGER_EVENT`.
- **Frames that advance on their own** (a sequence, a wave): every variant gets
  `onAppear.0.action="SET_VARIANT" onAppear.0.controls.variant="cycle" onAppear.0.delay="0.12s"`.
- **Plus/minus icon swap:** stack two IconNodes in a wrapper without stack layout. Animate their `rotation`, `scale` and
  `opacity` in the variants.
- **`flowEffect` is forbidden inside components** ("Move the node out of scope").
- **An icon from a project vector set is ignored in an instance's icon control.** Framer drops it silently, while sets
  like Lucide work. Instead do one of these:
  - bind the icon inside the component;
  - make a variant per icon;
  - ask the user to pick the icon in the editor.

## Code components

Use them only when the user asks, or when the canvas cannot do the task.

- **Place:** `+ComponentInstanceNode component="<component id>"`. Take the component id from
  `framer.agent.listComponents()`, not the code file's id.
- **Simple controls** (string, number, enum, slots) go through the DSL.
- **Object controls** (a carousel's `arrows`, `dots`, `clipping`) are refused as "unsupported type object". Set them
  through the plugin API and merge with the current value yourself:

  ```js
  const node = await framer.getNode(instanceId);
  await node.setAttributes({
    controls: { ...node.controls, arrows: { ...node.controls.arrows, show: false } },
  });
  ```

- **Arrays of objects in an instance** (a Repeat's items) take the same route, keyed by ids:
  `{ "<array control id>": [{ id: "…", "<field id>": "…" }] }`.
- **Image controls** (`ControlType.Image`) cannot be set through the API. The user picks the image in the editor.
- **Slots:** set `$control__<slot>.<i>="<id>"` to a layer that is a direct child of the page (a `WebPageNode` child,
  outside the breakpoints). Park slot content next to the Desktop frame.
- **In the canvas, slot content is Framer's internal renderer**, not your component. Props that a carousel injects
  (for example `variant` for the active card) do not reach it there, only on the site. Set the cards' variants by hand
  for the canvas.
- **Layout Jump Preventer** (a Framer University component) measures its grandparent.
  - Place it first in the variant root that holds all the content; deeper, it sets the wrong height and content spills
    under the next section.
  - Keep `gap` 0 on that root and space the content with padding: the zero-size first child adds a gap.
