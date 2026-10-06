# CMS, forms, Repeat

## CMS

Work with collections through `framer.agent.applyChanges`. The `framer` skill warns that collections made through the
plugin API can misbehave on the canvas.

- **Collection:** `+CollectionNode posts name="Posts";`
- **Fields:** `+Variable title name="Title" type="string" scope="posts";`
  - Framer makes a `LinkVariable` required. Fix it with `SET <id> required="false"`.
- **New fields come with values:** a boolean starts `true`, a color `#09F`, a number 0 and an enum its first case. An
  item written without them passes a "Featured is true" filter and shows bright blue, so write these fields on every
  item.
- **Field names are stored in Title Case:** `name="See also"` becomes "See Also".
- **List fields** (a gallery, rows of several values): `+ArrayVariable gallery name="Gallery" scope="<collection id>"
  items.0.type="image" items.0.name="Image";`. Write an item's entries by index with the field's key from `serialize`:
  `SET <item id> $control__gallery.0="<image url>";`, `$control__steps.0.recipe="…"`. Image URLs are uploaded. Show
  them with `repeat.variable` (see Repeat).
- **Items:** `+CollectionItemNode p1 parent="posts" index="0" $control__<field id>="…";` Take the field ids from the
  collection's `variables`.
- **Before deleting a field, find what binds to it:** `var(--variable-<id>)`, a dotted `.<id>`, `repeat.variable`, and
  list filters and sorting. Framer deletes a bound field without a word. The site then shows its placeholder "Content",
  and a deleted List field leaves the repeated node at 0 px (screenshots fail with "Node has invalid dimensions").
- **Delete a collection:** `DEL <collection id>`.
- **List:** a frame with `collectionList.collection="<id>"`; cap it with `collectionList.limit`.
- **Filter by a reference with the item's id,** not its slug: `collectionList.filters.0.variableId="<reference field
  id>"` with `transforms.0.name="equals"` and `transforms.0.value="<referenced item id>"`. A slug matches nothing,
  silently. Item ids come from `serialize` of the collection.
- **Pagination** (`collectionList.pagination="load-more"` or `"infinite-scroll"`) adds a `Load More` instance at
  `position="absolute" bottom="0px"` inside the list (infinite scroll adds a `Spinner` and keeps it), over the last
  row. Give the list a bottom padding of the button's height plus a gap. `serialize` never shows
  `collectionList.pagination`, so note what you set.
- **A CMS list can repeat a component instance.** Bind its controls to fields with
  `$control__title="var(--variable-<field id>)"`, and format values with transforms: `toDateString` for a date,
  `optionToDisplayName` for an option, `prefix` for a lead-in ("Logged by …"), and `convertFromBoolean` with outputType
  `option` to pick a variant from a boolean field (a highlighted entry).
- **Appear on a list:** stagger the items with `appearEffect.enter.stagger` on the list, not growing delays
  ([motion.md](motion.md)).
- **Ticker over CMS items:** put `tickerEffect.*` on the list frame, with `overflow="clip"`.
- **Alternating up/down cards:** a boolean field drives `visible` on a spacer inside the card. Keep an even number of
  items, so the alternation holds where the loop wraps around.

## Forms

- **The form:** `htmlTag="form"` on the frame.
- **Fields:** `FormPlainTextInputNode` (`formTextInputType="email"` for email), `FormBooleanInputNode`,
  `FormSelectNode`.
- **Checked look:** `formInputIconColor` is the radio dot or checkbox tick, `formInputCheckedFill` the checked
  background. Without `formInputIconColor`, a thick checked border (`formInputCheckedBorderWidth="6px"`) shows the
  browser's blue dot inside it.
- **Select placeholder:** the first option with `formSelectOptions.0.value=""` and not `disabled`. It shows in the
  placeholder color, and `required` still blocks an empty choice. A disabled first option makes the browser preselect
  the next one, which satisfies `required`.
- **Submit button:** an instance of a button component whose variant has `htmlTag="button"`. Give the component the
  variants Default, Pending, Success, Error and Incomplete.
- **Wiring:** `formSubmitButtonId="<instance id>"` on the form; a temp id from the same batch works. The state variants
  (`formButtonPendingVariant`, `formButtonSuccessVariant`, `formButtonErrorVariant`, `formButtonIncompleteVariant`,
  variant ids) go on the submit button instance, not on the form, and in a later batch. In the batch that creates the
  form they fail with "The target is not the form submit button", even after a `SET formSubmitButtonId` earlier in
  that batch. The rest of that batch is applied.
- **Where submissions go is not in the API.** No DSL or plugin API attribute sets a form's destination (Framer Forms,
  email, webhook, Sheets) or a redirect after success; `formSubmitTrackingId` is the only submission attribute. Ask the
  user to select the form in the editor and choose where it sends, then send a test from the published site.
- **What Framer cannot express:** no `fieldset`, `legend`, `role` or `aria-describedby` (`htmlTag` takes only article,
  aside, button, div, figcaption, figure, footer, header, main, nav, section, label and form). Make every radio
  option's label complete on its own, since the group's question is not announced, and keep long help text outside the
  label: inside it, the text becomes part of the field's name.
- **No focus event, native validation only:** give a hover tooltip `onTap` beside `onMouseEnter` on the same trigger,
  so a tap opens it too (touch screens have no hover). Field errors come only from the browser and the button's
  Incomplete and Error variants, so put words there ("Fill in the required fields", "Not sent. Try again").
- **A form in a modal:** see Overlays in [motion.md](motion.md).

## Repeat (array variables)

- **Array variable:**
  `+ArrayVariable items name="Items" scope="<component id>" items.0.type="string" items.0.name="Dose" …;`
- **Repeat a node:** `repeat.variable="var(--variable-<array id>)"` on the node. Texts inside bind to
  `var(--variable-<field id>)`; the field ids are in the variable's `items`.
- **`initialValue.<i>.<field>` keys are snake_case versions of the field names** (`dose`, not `Dose`).
- **An instance's array values with object items** are refused by the DSL ("unsupported array item type object"). Set
  them through the plugin API: see "Code components" in [components.md](components.md).
