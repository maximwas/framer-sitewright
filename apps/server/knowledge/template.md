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
- **A custom 404 page.** Required, even for a one-page template.
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
  - two promotional images that show the real template;
  - title, byline, short and full description, categories, pages and features;
  - price, preview link and remix link;
  - the setup requirements and limitations;
  - support contact and refund terms.

  Nothing in the template advertises anything else.
