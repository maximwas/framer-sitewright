# Pages and sections

The building blocks of a page and the rules that make them work. Structure follows [layout.md](layout.md) (Section >
Container > Content); motion follows [motion.md](motion.md). **Practice** unless marked otherwise.

## Page anatomy

- **A landing page has 5–8 sections.** A typical order:
  1. hero;
  2. trust strip (logos, rating, user count);
  3. problem or value;
  4. features or how it works;
  5. proof (testimonials, case studies, numbers);
  6. pricing or offer;
  7. FAQ;
  8. closing call to action, then the footer.
- **One primary action per page.** Repeat the same call to action in the hero, after the proof, and at the end. A
  secondary action (watch, learn more) is visually quieter.
- **Name sections after their role** (`Hero` only for product pages; `Introduction`, `Work`, `Contact` for portfolios),
  and give every section an `elementId` with `scrollTargetEnabled="true"` when the navigation links to it.
- **Consistent rhythm:** the same vertical section padding everywhere (for example 128 / 96 / 64 px on desktop /
  tablet / phone), the same container width, the same gap scale.

## Hero

- **Headline:** what it is, for whom, why it is different, in 10 words or fewer. One `h1` per page.
- **Subheadline:** one or two lines of context, `textWrap="balance"` for the headline and `"pretty"` for the paragraph.
- **Actions:** a primary button with an action verb ("Start a project", "Try it free"), an optional quieter secondary.
- **Visual:** a product shot, a photo, a shader or a type-led composition, never an icon or a gradient blob. Not
  decoration for its own sake ([distinct-design.md](distinct-design.md), images and assets).
- **Trust within the first screen:** a logo strip or a rating right under the actions.
- **Motion:** a single appear (`onMount`, opacity and a small `y`) on the hero copy, staggered by 0.06–0.1 s. No
  scroll-linked animation above the fold: it delays the first paint and can shift layout.
- **Height:** `height="auto"` with `minHeight="100vh"` only when the composition needs a full screen; otherwise let the
  content set it.

## Features

- **Three to six features,** each with an icon from one set, a short title and one or two sentences.
- **Layouts:** a 3-column grid that becomes one column on phone, alternating text and image rows, or a bento grid with
  rows of different heights built as separate grids (see [layout.md](layout.md), grids).
- **Equal-height cards:** `height="1fr"` children in an `auto` row (Field-tested).

## Social proof

- **Testimonials with a full name, photo, role and a specific outcome.** Keep them in a CMS collection, so the client
  can add more.
- **Logos** come from the Logos icon set or the project's vector set, in one neutral color.
- **Numbers** use tabular figures (`openTypeFontFeatures.tnum="on"`) when they sit in columns.
- **Results as before → after:** per row the metric and its context, then two bars in clipped tracks, a muted
  "before" at 100% and an accent "after" at its ratio (4 of 11 days = 36%), values beside them; each bar slides in
  from `x -720` on view. It says more than four big numbers in a row.
- **On phone** a testimonial loses its photo (a Compact variant, [components.md](components.md)), not its words.

## Statement

- **Photos between words:** a wrapping, centered stack of short text chunks (two or three words, `width="auto"`) and
  image pills (radius 100, 2:1, one line high: 112×56, 88×44 tablet, 60×30 phone). The hook in a muted color, the
  answer in the primary. It appears once, chunk by chunk ([scroll.md](scroll.md)).

## Pricing

- **Two or three plans,** the recommended one visually raised (border or accent fill), the same features list order in
  every card, the call to action at the same height in every card (cards with `height="1fr"`).

## FAQ

- **Five to eight questions** answering real objections. Build the item as a component with Closed and Open variants
  that animate height (see [motion.md](motion.md), things that open). A CMS list keeps them editable.

## Closing call to action and footer

- **Closing CTA:** one sentence restating the value, the same primary button as the hero. Add the person who answers:
  a round 56–64px portrait, name, role and when they reply.
- **404:** a small story from the site's subject (an operations studio's page "got lost in a handoff", told with its
  own Step cards), a photo of an empty place, and two actions: home, and report the broken link.
- **Footer:** logo, short navigation groups, contact, social icons, legal links, the year. Part of the layout template
  with the header.

## Navigation

- **Simple and recognizable:** logo left, 3–6 links, one button right. Sticky (`positionStickyTop="0"`) with a fill, so
  content scrolls under it.
- **Phone:** a drawer component (Phone and Phone Open variants) that opens by height (Field-tested, see
  [components.md](components.md)). Current-page links get `link.current.*` styles.
- **Section links** need the targets' `elementId` first (SKILL.md).

## Portfolio and editorial pages

- **Portfolio:** a personal introduction at a reading scale, strong project imagery, case studies as CMS detail pages,
  a simple contact at the end. No conversion banner.
- **Editorial:** a readable measure (50–75 characters), clear heading hierarchy, a post list from CMS, generous line
  height.
