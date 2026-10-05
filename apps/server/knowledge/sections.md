# Sections

Building blocks of a landing page and how to make each one look intended. Structure follows `layout`; the
look follows `direction`.

## Page anatomy

- 5–8 sections: hero, trust (logos, a rating), value or problem, features or how it works, proof (testimonials, case
  studies), offer or pricing, FAQ, closing call to action, footer. Drop what the brief does not need.
- One primary action, repeated with the same label in the hero, after the proof and at the end; a secondary action is
  visually quieter.
- Name layers by role (`Hero`, `Container`, `Content`, `Background`); one `h1` per page.

## Navigation

- Logo left, 3–6 links, one button right, on the container's edges. Sticky with its own fill at `index="0"` of the
  breakpoint, `zIndex="5"`. Three `1fr` columns (start / center / end) when the links should sit in the middle.
- Links are frames with a link (padding 8–12px around the text), so the text keeps its style's color.
- Phone: a menu (a component with closed and open variants that animate height; needs a key).

## Hero

- Headline: what it is, for whom, why it is different, in about ten words, display size with balance.
- One or two lines of context, then the actions. A real visual: product, photo, a type-led composition — never an
  icon or a gradient blob.
- Left-aligned with a visual beside or over it beats centered-everything; centered only when the composition is built
  around the center (a single large image below).
- Trust in the first screen: a logo strip or a rating right under the actions.

## Features

- Alternatives to six identical cards: alternating text and image rows; one large feature with two small ones (a bento
  of separate grids); a list with images; a single scroll scene (a pinned section whose list and images change step
  by step: `motion`).
- When cards are right: equal heights (`layout`), content from the top, the same order of elements, real images rather
  than icon tiles, no numbers unless they are steps.

## Proof

- Testimonials with a full name, photo, role and a specific outcome; real logos from the Logos icon set in one neutral
  color. Believable numbers (47 clients, 4.8 rating), never round ones.

## Pricing

- Two or three plans, the recommended one raised (border or accent fill), the same feature order in each, the buttons
  on one line (`layout`: spacer `1fr` above the button).

## FAQ

- Five to eight real objections; items open by animating height (needs a key for variants).

## Closing call to action and footer

- One sentence restating the value, the same button as the hero. A change of background (dark band) is enough; it does
  not need a card.
- Footer on the same container edges as the header: logo, short link groups, contact, legal, the current year.
