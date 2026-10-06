# Marketplace templates

A template is a site other people buy and edit. This file follows Framer's own checklist: "Template best practices"
and "How to publish a template" in Framer Help, both updated 2026-09-15, plus Framer Academy's "Get your template
ready". Read [design-process.md](design-process.md) first; this adds what changes when the site is a product.

## What changes

- **No review.** Framer publishes a template the moment it is submitted. Nobody else catches what is missing, so the
  checklist below is the bar.
- **The buyer is the user.** Everything they will change must be:
  - a color token or a text style;
  - a component control;
  - a CMS item.

  Never a value buried in one layer.
- **A specific audience and an original design.** Not a remix of another template, and more than Framer gives out of
  the box.

## Framer's checklist, built in

- **Design:** shared color and text styles everywhere; one hierarchy across pages; polished assets.
- **A custom 404 page,** even for a one-page template.
- **Layout:**
  - shared chrome (header, footer) in a layout template;
  - stacks, grids and auto heights;
  - no fixed sizes that break, no horizontal scroll at any width.
- **Text:** no lorem ipsum or placeholder copy; spelling checked; Framer's fonts; balanced headings.
- **Responsive:** desktop, tablet, phone and the widths between them; components adapt too.
- **Links:**
  - `mailto:` for email and `tel:` for phone;
  - every clickable thing has hover and pressed states;
  - no dead links (an anchor without a target counts).
- **CMS:** repeatable content (cases, posts, team, testimonials, jobs) in clearly named collections, connected to what
  shows it; no empty or unused items.
- **Code:** native features first; custom code minimal and readable.
- **Effects:** few, purposeful, smooth and cheap on phones.
- **Assets:** clearly named folders, descriptive names, no duplicates.
- **Tags:** one `h1` per page, headings in order, `altText` on meaningful images.
- **Accessibility and SEO:** a title and description per page; enough contrast; labeled form fields.
- **Performance:**
  - Framer's performance checks;
  - images at about twice their shown size;
  - short, compressed, muted video with a poster.
- **Copyright:** assets original or licensed (Unsplash is); client work only with permission; fonts from Framer's
  library.

## Conventions that keep it editable

- **Names by role:**
  - tokens `Surface/Base`, `Text/Primary`, `Accent/…`;
  - text styles `Heading/H2`, `Body/Default`;
  - components in folders `Brand/Logo`, `Buttons/Button`, `Navigation/Header`;
  - every layer named.
- **The logo is a component:** an SVG mark and wordmark in `Brand/Logo` with light and dark variants.
- **Controls for what changes:** label, link, image, variant. Links are link variables bound to the root (see
  [components.md](components.md)).
- **Dark values on every token.**
- **A "Start here" design page,** unpublished: the fonts, styles, components and collections, and how to change logo,
  colors and content.

## Before listing

- Preview every page and link; resize slowly between breakpoints.
- Remix it into a clean account and use it as a buyer would.
- The listing needs:
  - two promotional images showing the real template;
  - title, byline, short and full description, categories, pages, features;
  - price, preview link and remix link;
  - setup requirements and limitations, support contact, refund terms;
  - no ads or unrelated promotions inside the template.
