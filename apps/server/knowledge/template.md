# Template: a site for the Framer Marketplace

A template is a site other people buy and edit. Everything here follows Framer's own checklist ("Template best
practices" and "How to publish a template" in Framer Help, both updated 2026-09-15). Read `workflow` first; this topic
adds what changes when the site is a product.

## What changes

- **There is no review.** Framer publishes a template the moment it is submitted, so nobody else catches what is
  missing. The checklist below is the bar.
- **The buyer is the user.** Whatever they will change must be a color token, a text style, a component property or a
  CMS item, never a value buried in one layer.
- **A specific audience.** The template solves one clear use case and is original: not a remix of another template,
  and it gives more than Framer does out of the box.

## Build it in (Framer's checklist)

- **Design:** shared color and text styles applied everywhere; one hierarchy across pages; polished visual assets.
- **A custom 404 page.** Expected even for a one-page template (Framer's checklist recommends it, and every top
  template has one).
- **Layout:** each page has a clear purpose; shared chrome (header, footer) in a layout template; stacks, grids and auto
  heights; no fixed sizes that break; no horizontal scroll at any width.
- **Text:** no lorem ipsum or placeholder text; spelling and grammar checked; Framer's fonts; headings balanced.
- **Responsive:** desktop, tablet and phone, and the widths between them; components adapt too.
- **Links:** email as `mailto:`, phone as `tel:`; every clickable thing looks clickable and has hover and pressed
  states; no dead links (an anchor without a target counts).
- **CMS:** repeatable content (cases, posts, team, testimonials, jobs) in collections with clear names, connected to
  the pages and components that show it; no empty or unused items.
- **Code:** native Framer features first; custom code only when needed, minimal and readable.
- **Effects:** few and purposeful, smooth, and cheap on phones.
- **Assets:** in clearly named folders, descriptive names, no duplicates.
- **Tags:** one `h1` per page, headings in order, `altText` on every meaningful image.
- **Accessibility and SEO:** a title and description for every page in the site settings; enough contrast; labeled
  form fields.
- **Performance:** run Framer's performance checks; images at about twice their shown size; video short, compressed and
  muted, with a poster image; no large uncompressed files.
- **Copyright:** every asset original or licensed (Unsplash photos are; client work only with permission); fonts from
  Framer's library.

## Conventions that make it editable

- **Names by role:**
  - tokens: `Surface/Base`, `Text/Primary`, `Accent/…`;
  - text styles: `Heading/H2`, `Body/Default`;
  - components in folders: `Brand/Logo`, `Buttons/Button`, `Navigation/Header`;
  - every layer named; no "Frame 12".
- **Logo as a component:** an SVG mark plus wordmark in `Brand/Logo`, with light and dark variants, so the buyer swaps
  it in one place.
- **Controls for what changes:** label, link, image, variant. A link is a link variable bound to the component's root.
- **Dark values** on every token, so the buyer can turn on a dark theme.
- **A start page for the buyer:** an unpublished design page "Start here" that lists the fonts, styles, components and
  collections, and how to change the logo, colors and content.

## Before listing it

- Preview every page and link; resize slowly between breakpoints, not only at the presets.
- Remix the template in a clean account and check that it works as a starting point.
- The listing needs:
  - four images at 1600×1200 (4:3), the first the thumbnail and the strongest; a video helps;
  - a one-word name, a byline naming the audience, a description that lists the pages, categories, styles and
    features, and the preview URL;
  - a free template's remix link, or a paid one's checkout URL (Polar, Lemon Squeezy, Contra, Gumroad, Stripe) that
    goes straight to payment at the listed price, is public and states a refund policy. Framer takes no payments and
    issues no refunds: the creator sends the remix link after purchase;
  - the Framer plan it needs (Basic: 30 pages, 2 CMS collections; Pro: 150 and 10; legal, team, FAQ and testimonial
    collections count);
  - support contact, setup requirements and limitations.

  Nothing in the template advertises anything else. Framer's checklist items are recommendations, not requirements;
  every top template still meets them.

## A "Start here" page for buyers

- A design page named "Start here" with one board: a short heading and six to nine cards, one per thing a buyer edits
  — colors (which token rebrands the accent), type (the families and where sizes live), hero media, the components on
  the home page, slider slides, the CMS collections, contact details (every place they appear), motion, and what to
  set before publishing. Plain words, with the panel names Framer shows (Assets → Colors, Page Settings).

## Ready for buyers and their agents

- **AI-ready:** a project skill for Framer's agent with the template's conventions (`+SkillNode` with `description`,
  `instruction`, `trigger`; its title becomes the slash command), a short `.md` brief for external agents, and prompts
  for a rebrand, a logo swap and form wiring.
- **Buyer documents:** a prelaunch checklist (domain, favicon and social image, form destinations, cookie banner and
  legal pages, analytics, deleting the preview's Buy button), CMS field descriptions, a changelog in the listing.
- **Preview only:** a floating "Buy template" button named for deletion (`Delete me`).
- **Dependencies named:** list every third-party service (FramerAuth, form back-ends, video players, smooth scroll);
  never ship sign-up, sign-in or checkout pages that do not work without one.

## Site metadata

- Site-wide values live on the root node: `SET rootNode metadata.title="…" metadata.description="…"
  metadata.favicon="…" metadata.faviconDark="…" metadata.appleTouchIcon="…" metadata.socialImage="…";`. Pages
  override them only when they differ (the 404 sets `noIndex`).
- Favicon: the brand mark as SVG, a light and a dark one; Apple touch icon: a 180×180 PNG of the mark on the base
  color; social image: 1200×630, a screenshot of the hero (`node_screenshot` with `clip`). Update them whenever the
  brand changes: old colors in the tab icon give a redesign away.

## Carousels with slots

- A Marketplace carousel takes its slides through a slot control: `$control__slides.0="<id>"
  $control__slides.1="<id>"`, each id a layer that sits directly on the page canvas, next to the breakpoints (create
  the slides there with `parent="<page id>"`, name them, and place them beside the breakpoints).
- Text in a slot item needs a text style without balance: with balance, its auto-width frame measures wrong and ticker
  items overlap. Give slot labels a style of their own (`Ticker`).
- Many carousels measure the first slide and never resize it (Stacking Slider), and Framer's canvas renders a
  breakpoint copy with the primary's slots. So build one carousel per width with its own slides (desktop 1120, tablet
  680, phone 300) and show each on its breakpoints only (`visible`), instead of overriding the slots on a copy.
- Object controls of a code component (its `transition`, arrow styles) go through `component_controls_set`, once per
  instance and once per breakpoint copy: setting the primary does not reach the copies. A tween default becomes a
  spring there too. A transition Framer refuses comes back in `notStored` (seen: Stacking Slider kept its tween
  default): then ask the user to set the spring in the component's panel, and list it at handoff.

