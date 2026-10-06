# Pages and sections

The building blocks of a page and the rules that make them work. Structure follows [layout.md](layout.md) (Section >
Container > Content); motion follows [motion.md](motion.md). **Practice** unless marked otherwise.

## Page anatomy

- **A page is a set of jobs in a usable order:** explain, prove, offer, answer, act. Best-selling templates run a
  median of nine sections (7–11); a local business with one strong idea can stay short. Take each section's form from
  the concept (a diagnosis table "what you tell us → what we do", proof as before → after in the unit, a calculator,
  an archive, chapter openers), not from the SaaS order of logos, features, testimonials, pricing and FAQ. A local
  business adds service areas, hours and locations, a phone or booking action, a menu or gallery.
- **One primary action per page.** Repeat the same call to action in the hero, after the proof, and at the end. A
  secondary action (watch, learn more) is visually quieter.
- **Name sections after their role** (`Hero` only for product pages; `Introduction`, `Work`, `Contact` for portfolios),
  and give every section an `elementId` with `scrollTargetEnabled="true"` when the navigation links to it.
- **Consistent rhythm:** the same vertical section padding everywhere (for example 128 / 96 / 64 px on desktop /
  tablet / phone), the same container width, the same gap scale.

## Hero

- **Two hero modes.** *Explain* (software, B2B, unfamiliar categories): what it is in about ten words, the product,
  one action. *Evoke* (local services, brands, places, people, editorial): the most characteristic image, object,
  question or sentence of the subject's world. In both, the plain description (what, where, for whom) is on the first
  screen or within the first scroll. One `h1` per page.
- **Subheadline:** one or two lines of context, `textWrap="balance"` for the headline and `"pretty"` for the paragraph.
- **Actions:** a primary button with an action verb ("Start a project", "Try it free"), an optional quieter secondary.
- **Visual:** a product shot, a photo, a shader or a type-led composition, never an icon or a gradient blob. Not
  decoration for its own sake ([distinct-design.md](distinct-design.md), images and assets).
- **Trust under the actions** (a logo strip, a rating) is a SaaS and B2B habit. A local business shows its place,
  hours and a person instead.
- **Motion:** a single appear (`onMount`, opacity and a small `y`) on the hero copy, staggered by 0.06–0.1 s, but the
  hero heading or main image (the LCP element) starts visible or moves by `y` only ([motion.md](motion.md), Appear).
  No scroll-linked animation above the fold: it delays the first paint and can shift layout.
- **Height:** `height="auto"` with `minHeight="100vh"` only when the composition needs a full screen; otherwise let the
  content set it.

## Features

- **Three to six features,** each with an icon from one set, a short title and one or two sentences.
- **Layouts:** a 3-column grid that becomes one column on phone, alternating text and image rows, or a bento grid with
  rows of different heights built as separate grids (see [layout.md](layout.md), grids).
- **Equal-height cards:** `height="1fr"` children in an `auto` row (Field-tested).

## Social proof

- **Testimonials with a full name, photo, role and a specific outcome.**
- **Proof is real.** On a client's site, testimonials, people, numbers and client logos come from the client. Invented
  reviews and testimonials are illegal (US FTC rule since 13 Oct 2024, up to $51,744 per violation; EU since May 2022),
  and logos need permission. Mark stand-ins as placeholders and list them at handoff. Keep testimonials in a CMS
  collection so the client can add more.
- **A Marketplace template** uses invented marks, never real brands (Framer: no company logos without permission), and
  lists its placeholder reviews on the Start here page. Logos sit in one neutral color, from the project's vector set.
- **Numbers** use tabular figures when they sit in columns. On a text node that has a text style,
  `openTypeFontFeatures.tnum` is refused ("Cannot apply preset-controlled text properties"): give the figures a text
  style of their own (`Figure`) and set the feature on that style.
- **Results as before → after:** per row the metric and its context, then two bars in clipped tracks, a muted
  "before" at 100% and an accent "after" at its ratio (4 of 11 days = 36%), values beside them. Animate the tracks
  (`x -160`, opacity 0, the after track 0.2s later), not the bars ([motion.md](motion.md), Appear). It says more than
  four big numbers in a row.
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
- **A header that changes on scroll** (transparent over the hero, filled after it) is a header component with two
  variants switched by a `scrollVariantEffect` (`onScrollTarget`) aimed at the first section after the hero, or an
  invisible trigger frame there ([scroll.md](scroll.md), Scroll Variants). A header that hides on scroll down needs
  code.
- **Phone:** a drawer component (Phone and Phone Open variants) that opens by height (Field-tested, see
  [components.md](components.md)). Current-page links get `link.current.*` styles. Every link in the open variant also
  switches the menu to its closed variant; on links to absolute URLs give that switch a 0.1s delay, or iOS can drop the
  navigation. The open menu lies over the page rather than pushing the content down (Framer Help). Links that are
  component instances take no `onTap`: give the link component an `EventHandlerVariable` fired by
  `onTap.0.action="TRIGGER_EVENT"`, and on each instance in the open variant set `onClick.0.action="SET_VARIANT"` to
  the closed variant ([components.md](components.md)). Seen: the menu stayed open over the section a link scrolled
  to. Tap every link of the open menu on a phone in Preview.
- **Section links** need the targets' `elementId` first, `link.smoothScroll` on every link frame (inside the button
  and nav link components too) and `scrollMarginTop` on each target, so the sticky header never covers the heading
  (SKILL.md). Click every navigation link in Preview at each breakpoint.

## Portfolio, editorial and inner pages

- **Portfolio:** a personal introduction at a reading scale, strong project imagery, case studies as CMS detail pages,
  a simple contact at the end. No conversion banner.
- **Editorial:** a readable measure (50–75 characters), clear heading hierarchy, a post list from CMS, generous line
  height.
- **A project page** (CMS detail): hero image or video, meta (client, year, services), gallery, challenge → approach →
  results, credits, previous/next, more projects.
- **An article:** title, date, category and cover, the body in a rich text inside `htmlTag="article"`, related posts,
  the call to action.
- **Legal pages** as one CMS collection (`/legal/:slug`); a contact page whose form shows pending, success and error
  states.
- **Pricing with a monthly/yearly toggle:** variants of one component, laid out per breakpoint.
