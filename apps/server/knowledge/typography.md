# Typography

Numbers below come from measuring sixteen top Framer sites (marketplace bestsellers, Awwwards Site of the Day and
Honorable Mentions, framer.com) at 1440, 810 and 390.

## Families

- A workhorse plus up to two voices, each with a job named in the concept (quotes, data, the maker's hand); say why
  each fits. A superfamily (one designer, several widths) pairs most reliably: Sofia Sans with Sofia Sans Extra
  Condensed.
- **Inter is the first default to avoid** unless the brief is product-led. When it is used, set it as top sites do:
  tracking −0.035…−0.07em at display sizes, line height 0.9–1.0 (not lower with accents or Cyrillic), left-aligned.
  The generated look is Inter at 48–64px, tracking 0, line height 1.2, weight 600–700, centered.
- **Pick the family from the concept, not from the usual list.** Satoshi, General Sans, Switzer and Inter are the most
  common free picks; reach past them with `fonts_search` and `fonts_discover` (Google Fonts and Fontshare by category,
  trend and novelty).
- **Check the language before the look.** `fonts_discover` `script` (cyrillic for Ukrainian) and the specimen for the
  site's own signs: a family can cover Cyrillic and still lack ₴, and Framer silently draws a missing sign in another
  face. Display line heights under 0.9 make accents and Cyrillic descenders collide: check a real heading.
- **License:** Google Fonts and Framer's built-in library are free everywhere. Fontshare's files (ITF FFL v2.0) may be
  uploaded only to the user's own site: for a client's site or a sold template use the family from Framer's library.
  Retail fonts need a webfont license in the client's name; trial cuts go only on unpublished pitch pages. Credit OFL
  foundries that ask for it (Velvetyne) in a colophon. Framer's Open Source category (Collletttivo, Velvetyne) is
  distinctive and safe for templates.

## Scale and hierarchy

- The largest heading is **at least 4×** the body size (top sites: median about 6.5; 48 on 16 = 3 reads flat).
- Display size follows the hero mode (`workflow`, step 2): evoke heroes set the display at 124–240px at 1440; explain
  heroes at 48–86px, with the product beside the headline carrying the weight. When the product UI or a photo is the
  display element, the headline may be small (pen.dev: 32px over a 20px body). The 4× floor is for type-led pages.
- Body 16–20px, line height 1.4–1.5. Card titles and h3 24–48px, line height 1.08–1.35. Display 64px and up, line
  height 0.9–1.1.
- Display weight 400–600 (300 and 100 work for elegant faces); 700–800 only when the display is a wordmark or a
  graphic word.
- Few sizes: about eight per breakpoint at most. Similar sizes share one weight.

## Tracking

- Display 40px and up: negative, −0.02…−0.06em (median −0.04em).
- Uppercase: positive, +0.04…+0.12em. Body: 0.

## Lines and measure

- **Headings: `balance: true` on their text styles** (`text_styles_upsert`), so no headline ends with one word alone.
  `maxWidth` on a heading does not replace balance. Paragraphs: pretty wrapping when the DSL is available
  (`textWrap="pretty"`).
- Body measure 45–75 characters: about `maxWidth` 560–720px at 16–18px. Card text no narrower than about 25 characters.
- A forced line break is a `TextLineBreak` (DSL), never a newline in the text; prefer balance, which works at every
  width.
- A new text style gets `paragraphSpacing` 20px from Framer (`text_styles_upsert` leaves it unset), so text of several
  blocks (stacked lines, a column of digits) has 20px between them. Set `paragraphSpacing` on purpose: 0 where the
  blocks sit line on line.

## Labels and emphasis

- A label above a heading only where it names a real category, short and in sentence case (16px, weight 500,
  +0.03em). Uppercase is for metadata (names, roles, small captions), with positive tracking.
- Emphasis inside a headline by tone (the same family and color at a lower opacity or a muted token), not another font
  or a random color.
- Numbers in columns use tabular figures.

## Breakpoints

- Display styles get slots for the narrower breakpoints: ×0.75 on tablet, ×0.4–0.67 on phone (framer.com 54 → 42 →
  36, Vectura 80 → 64 → 48, Essentia 64 → 46 → 36). Body stays 16–18.
