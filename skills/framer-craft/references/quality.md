# Quality before launch

Run this before telling the user a site is ready. **Practice** (Framer's help center and experienced creators) unless
marked otherwise; how to check visuals is in [verify.md](verify.md).

## Responsive
- Every page on every breakpoint: no horizontal scroll, no text wrapping one word per line, no clipped content.
- Effects count too: an appear or scroll-transform start state with an x offset, rotation or scale past the screen
  edge scrolls the page sideways on phones. Keep start offsets inside the section, or put the moving layer in a parent
  with `overflow="clip"` (never `hidden`, which breaks sticky).
- Grids that become one column switch to a vertical stack or `fit` rows (Field-tested, [layout.md](layout.md)).
- Tap targets at least 44 × 44 px on phone (menu button, small links get padding).

## Speed
- **Images:** upload at the size they are shown (2× for retina), compressed; Framer converts to WebP and resizes. Logos
  and icons are SVG or icon sets.
- **Fonts:** a workhorse and at most two voices, two or three weights each; library (Google) fonts load only the
  needed characters.
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
  that carry meaning, for every text on every fill it sits on, in every state: button variants, hover, light and dark
  token values. A bright accent takes a dark label when a white one fails. Every surface reads apart from what lies
  under it (a tone step, a border or a shadow), in every state.
- **Keyboard and screen readers:** real `button` / link semantics on clickable frames (`htmlTag="button"` or
  `link.href`), `ariaLabel` on icon-only buttons, a visible hover and focus state.
- **Motion:** the site's Reduced Motion setting is on ([motion.md](motion.md)); nothing flashes more than three times a
  second; anything that moves by itself for more than 5 s can be paused; every row of every states list passes in a
  real browser ([verify.md](verify.md), Behaviour in a real browser).
- **Forms:** every field has a visible label, errors in words, not only in color; the submit button has Pending,
  Success, Error and Incomplete variants; the user has set where the form sends and a test went through on the
  published site ([cms-forms.md](cms-forms.md)). Every modal has a close button with `ariaLabel`: a modal does not
  close on Escape.

## Content
- No placeholder text, no lorem ipsum, no stock photo that contradicts the copy.
- Page copy speaks to the site's visitors only: notes for whoever edits the site go on a guide page or into the
  handoff ([marketplace-template.md](marketplace-template.md), Start here).
- Every photo of the site seen together on one contact sheet: no person, place or shoot twice, one art direction
  ([assets.md](assets.md)).
- Typography: curly quotes and real apostrophes (Framer converts straight ones, Field-tested), no widows in headlines
  (`textWrap="balance"`).
- Every link and button goes somewhere real; forms submit and show success.

## Concept and words
- A stranger can say in five seconds what the site is about; with a competitor's logo on it, the page no longer fits.
- The idea shows in the first screen, the signature, the vocabulary, the form of the proof and the ending, and stays
  out of navigation, forms, prices and legal text.
- The signature has a phone version and reads with reduced motion; the 404, footer line and cookie banner speak in the
  voice.
- No unverified claims, no invented reviews on a client's site.
- Every font and image is licensed for this use; every language's letters and the copy's signs render in the chosen
  faces.

## Handoff
- **Hand to the user, with where to click** (no API reaches them): each form's Send To destination (email, Google
  Sheets or a webhook, a redirect after submit) and its spam protection, since the DSL builds only the form's layers;
  uploading custom fonts; the site's language; connecting a domain; password protection and staging.
- CMS collections for everything the client will update (posts, cases, team, testimonials, FAQ).
- A project skill with the conventions for future agents.
- Publish only when the user asks (SKILL.md).
