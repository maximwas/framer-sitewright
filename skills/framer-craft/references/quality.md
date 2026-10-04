# Quality before launch

Run this before telling the user a site is ready. **Practice** (Framer's help center and experienced creators) unless
marked otherwise; how to check visuals is in [verify.md](verify.md).

## Responsive
- Every page on every breakpoint: no horizontal scroll, no text wrapping one word per line, no clipped content.
- Grids that become one column switch to a vertical stack or `fit` rows (Field-tested, [layout.md](layout.md)).
- Tap targets at least 44 × 44 px on phone (menu button, small links get padding).

## Speed
- **Images:** upload at the size they are shown (2× for retina), compressed; Framer converts to WebP and resizes. Logos
  and icons are SVG or icon sets.
- **Fonts:** two families at most, two or three weights each; library (Google) fonts load only the needed characters.
  Weights between Light and Extra Bold avoid invisible text while loading.
- **Video:** muted, looped, no controls (lazy-loaded, plays when visible), or YouTube / Vimeo for long ones; no autoplay
  with sound.
- **Effects:** blur below 10, few shadows, no scroll-linked animation above the fold (see [motion.md](motion.md)).
- **Code and embeds:** only on the pages that need them; scripts with `defer` (or `async`) at the end of the body.
- **Measure** with PageSpeed Insights on the published site, phone first.

## SEO
- **Site metadata** on the `RootNode`: `metadata.title`, `metadata.description`, `metadata.favicon`,
  `metadata.socialImage` (Field-tested for title, description, favicon).
- **Per page:** its own title (50–60 characters) and description (140–160 characters) when it differs from the site's;
  CMS detail pages use template variables (`{{Title}}`).
- **Structure:** one `h1` per page, headings in order, descriptive link text, `altText` on every meaningful image.
- **URLs:** short, lowercase, hyphenated paths; redirects for moved pages; no draft pages linked from published ones.

## Accessibility
- **Contrast:** at least 4.5 : 1 for body text, 3 : 1 for large text (24 px, or 19 px bold) and for icons and borders
  that carry meaning. Check both light and dark token values.
- **Keyboard and screen readers:** real `button` / link semantics on clickable frames (`htmlTag="button"` or
  `link.href`), `ariaLabel` on icon-only buttons, a visible hover and focus state.
- **Motion:** respects reduced motion; nothing flashes more than three times a second.
- **Forms:** every field has a visible label, errors in words, not only in color.

## Content
- No placeholder text, no lorem ipsum, no stock photo that contradicts the copy.
- Typography: curly quotes and real apostrophes (Framer converts straight ones, Field-tested), no widows in headlines
  (`textWrap="balance"`).
- Every link and button goes somewhere real; forms submit and show success.

## Handoff
- CMS collections for everything the client will update (posts, cases, team, testimonials, FAQ).
- A project skill with the conventions for future agents ([design-process.md](design-process.md), handoff).
- Publish only when the user asks (SKILL.md).
