# Direction: designed, not generated

What top Framer sites do, in numbers, and the habits that make a page read as AI-made. Where the user's brief asks for
something on the list, the brief wins.

## Start from the subject

- Name the subject first: what it is, for whom, the page's one job. Distinctive choices come from the subject's world:
  its materials, tools, places, photography. A ceramics studio and a trading desk never share a palette or a type
  pairing.
- Open with the most characteristic thing of that world: a photograph, the product, a headline set as an image, a real
  number that matters.

## Composition (what the best sites share)

- **Left alignment dominates:** only about 16% of headings on top sites are centered. Centered text is for one or two
  moments per page (a manifesto line, the closing call to action), never every section.
- **Asymmetry:** columns 5/7 or 4/8 rather than 6/6; a small text column against a large one; images of different
  heights, offset vertically.
- **Overlap and depth:** media over type (a product cut-out over the last line of a headline, a phrase over two
  photos), done with absolute layers inside a section.
- **Hierarchy by size and emptiness:** generous white space around the one thing that matters; not everything is a
  card.
- **Vary the section skeletons.** Not every section is "label, heading, subheading, grid of cards".

## Color

- A neutral base with a temperature (sand, cream, sage, off-black) + one saturated accent, locked for actions and real
  highlights. Three or four colors in all.
- Muted text as the main text color at 60% (a muted token), so it stays in tone on colored backgrounds.
- Separate sections by a change of background (white / light grey / dark), not by borders.
- Neutrals of one temperature; tinted shadows, never pure black.

## Imagery

- **Media covers about half of a top site's page (median 47%).** A page without images is outside the range
  entirely — it reads unfinished, not minimal.
- One art direction: the same light, temperature and framing across the site. Cut-outs with alpha on a calm base make
  product compositions without fake interfaces.
- Asset order: the client's own material, then stock (`images_search` with a key, or `image_upload` by URL), then a
  clearly named placeholder frame with the size it needs — and tell the user. Never fill the gap with icons.

## Looks that read as generated (avoid as defaults)

- Palettes: cream + display serif + terracotta; near-black + one acid green; beige + brass for "premium";
  purple-to-blue glows, gradient text, permanent dark theme with purple and low-contrast grey text.
- Template chrome: an uppercase tracked label above every heading; a pill badge above the H1 ("New", "AI-powered");
  section numbers 01/02/03 when the items are not steps; an icon in a colored square above every card title; a colored
  border on one side of cards; colored dots before items; `→` after every link; emoji as icons.
- Structures: six identical feature cards; cards inside cards inside cards; a statistics row of round numbers ("10x",
  "99.9%"); "How it works" steps 1-2-3 for something that has no steps; the same section skeleton everywhere;
  everything symmetric, every split 50/50.
- Uniformity: the same padding 24, radius 16 and gap 24 at every level; everything weight 500–600 at 16/20/32/48 with
  nothing dominating.
- Effects: glows and blurred blobs behind the hero, pulsing dots and scanning lines, the same fade-up on every section,
  every section 100vh.
- Copy: H2s that all start the same way ("Everything you need to…", "Built for…"); confident but empty lines that fit
  any company; generic names (Acme), filler verbs (elevate, seamless, unleash); a different label for the same action;
  "© 2024" on a 2026 site.
- Framer defaults left in place: centered everything (stacks center by default), blue text links, a header wider than
  the content, one gap for heading, text and buttons.

## Before building, check the plan

Ask of each part of the plan: would any similar brief get this? If yes, change it, and say what changed and why.
