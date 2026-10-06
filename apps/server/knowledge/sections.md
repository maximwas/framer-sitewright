# Sections

Building blocks of a landing page and how to make each one look intended. Structure follows `layout`; the
look follows `direction`.

## Page anatomy

- A page is a set of jobs in a usable order: explain, prove, offer, answer, act. The usual sections (hero, trust,
  value or problem, features or how it works, proof, pricing, FAQ, closing call to action, footer; best-selling
  templates average nine) are a checklist of those jobs, not a skeleton: take each section's form from the concept (a
  case as an order ticket, proof as before → after in the unit, a calculator, an archive, chapter openers). Drop what
  the brief does not need.
- One primary action, repeated with the same label in the hero, after the proof and at the end; a secondary action is
  visually quieter.
- Name layers by role (`Hero`, `Container`, `Content`, `Background`); one `h1` per page.

## Navigation

- Logo left, 3–6 links, one button right, on the container's edges. Sticky with its own fill at `index="0"` of the
  breakpoint, `zIndex="5"`. Three `1fr` columns (start / center / end) when the links should sit in the middle.
- Links are frames with a link (padding 8–12px around the text), so the text keeps its style's color.
- Phone: a menu (a component with closed and open variants that animate height; needs a key).

## Hero

- Two modes (`workflow`, step 2). **Explain** for software, B2B and unfamiliar categories: what it is, for whom, why
  it is different, in about ten words, display size with balance, plus the product. **Evoke** for brands, places,
  people and editorial: an image, an object, a question or a manifesto, with the plain description in a smaller line
  or the first scroll.
- One or two lines of context, then the actions. A real visual: product, photo, a type-led composition — never an
  icon or a gradient blob.
- Left-aligned with a visual beside or over it beats centered-everything; centered only when the composition is built
  around the center (a single large image below).
- Trust right under the actions (a logo strip, a rating) is a SaaS and B2B habit: use it there, not on every hero.
- A card laid over the hero media (a field note, a stat) is for desktop: give it a boolean variable and hide it on
  tablet and phone, where it covers the headline. The hero stage takes `height="auto"` with a `minHeight`, never a
  fixed height: the headline wraps more on narrow screens.

## Statement

- One large sentence between hero and features, the problem and the answer in two tones (muted hook, primary answer).
- Photos between words (a trend of top Framer sites): a wrapping horizontal stack of short text chunks (two or three
  words each, `width="auto"`, the statement style) and image pills (radius 100, 2:1, about one line high: 112×56 on
  desktop, 88×44 tablet, 60×30 phone), centered. Each pill shows the words before it.
- Motion: it appears once as it enters, chunk after chunk (`appearEffect` y 24 and opacity 0, 0.06s apart; pills scale
  from 0.6). Not a scroll-scrubbed fade: that leaves the text faint while people read it.

## Features

- Alternatives to six identical cards: alternating text and image rows; one large feature with two small ones (a bento
  of separate grids); a list with images; a single scroll scene (a pinned section whose list and images change step
  by step: `motion`).
- When cards are right: equal heights (`layout`), content from the top, the same order of elements, real images rather
  than icon tiles, no numbers unless they are steps.

## Proof

- Testimonials with a full name, photo, role and a specific outcome, in the concept's unit. On a client's site only
  real ones the client gives (invented reviews are illegal: FTC rule since 2024, EU since 2022); mark placeholders and
  list them at handoff. Client logos only with permission, in one neutral color; a Marketplace template uses invented
  marks, never real brands.
- A testimonial card is one solid card (`layout`, Cards made of two pieces). On phone give the component a **Compact**
  variant: the quote, name and role only, no photo, 24px padding, the quote one style smaller.
- A slider: offer a free Marketplace carousel (`marketplace_browse` components, `carousels`, checked with
  `marketplace_item` `inspect`) or a native one with a variant per slide; see `template`, Carousels with slots, for how slots and breakpoints work.

## Numbers

- Results read best as before → after, not as four big numbers: per row the metric and its context on the left, two
  bars on the right (a muted "before" bar at 100%, an accent "after" bar at its ratio, e.g. 4 of 11 days = 36%) with
  the values beside them. The track (a clipped frame holding the bar) slides in from `x -160` with opacity 0 on view,
  the after track 0.2s later; the bars themselves carry no effect (`motion`, Appear needs a visible layer). One large
  stat (47 companies) can sit beside the heading.

## Pricing

- Two or three plans, the recommended one raised (border or accent fill), the same feature order in each, the buttons
  on one line (`layout`: spacer `1fr` above the button).

## FAQ

- Five to eight real objections; items open by animating height (needs a key for variants). Keep every answer in the
  page (closed items clipped, not deleted) so search engines read them.

## Closing call to action and footer

- One sentence restating the value, the same button as the hero. A change of background (dark band) is enough; it does
  not need a card.
- Put a person next to the action: a 56–64px round portrait, name and role, and when they reply ("Takes every first
  call. Replies within one working day"). A service is bought from people.
- Footer on the same container edges as the header: logo, short link groups, contact, legal, the current year.

## 404

- Tell a small story from the site's subject instead of "Oops": an operations studio lost the page "in a handoff" and
  shows the trail with its own Step component (link clicked → handed off → lost here), next to a photo of an empty
  place. Two actions: back home, and report the broken link (`mailto:` with a subject).
