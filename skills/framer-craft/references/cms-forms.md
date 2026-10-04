# CMS, forms, Repeat

## CMS

Work with collections through `framer.agent.applyChanges`. The `framer` skill warns that collections made through the
plugin API can misbehave on the canvas.

- **Collection:** `+CollectionNode posts name="Posts";`
- **Fields:** `+Variable title name="Title" type="string" scope="posts";`
  - Framer makes a `LinkVariable` required. Fix it with `SET <id> required="false"`.
- **Items:** `+CollectionItemNode p1 parent="posts" index="0" $control__<field id>="…";` Take the field ids from the
  collection's `variables`.
- **Delete a collection:** `DEL <collection id>`.
- **List:** a frame with `collectionList.collection="<id>"`; cap it with `collectionList.limit`.
- **Ticker over CMS items:** put `tickerEffect.*` on the list frame, with `overflow="clip"`.
- **Alternating up/down cards:** a boolean field drives `visible` on a spacer inside the card. Keep an even number of
  items, so the alternation holds where the loop wraps around.

## Forms

- **The form:** `htmlTag="form"` on the frame.
- **Fields:** `FormPlainTextInputNode` (`formTextInputType="email"` for email), `FormBooleanInputNode`,
  `FormSelectNode`.
- **Submit button:** an instance of a button component whose variant has `htmlTag="button"`. Give the component the
  variants Default / Pending / Success.
- **Wiring on the form:** `formSubmitButtonId="<instance id>"`, `formButtonPendingVariant` and
  `formButtonSuccessVariant` (also `formButtonErrorVariant`, `formButtonIncompleteVariant`). A temp id from the same
  batch works.

## Repeat (array variables)

- **Array variable:**
  `+ArrayVariable items name="Items" scope="<component id>" items.0.type="string" items.0.name="Dose" …;`
- **Repeat a node:** `repeat.variable="var(--variable-<array id>)"` on the node. Texts inside bind to
  `var(--variable-<field id>)`; the field ids are in the variable's `items`.
- **`initialValue.<i>.<field>` keys are snake_case versions of the field names** (`dose`, not `Dose`).
- **An instance's array values with object items** are refused by the DSL ("unsupported array item type object"). Set
  them through the plugin API: see "Code components" in [components.md](components.md).
