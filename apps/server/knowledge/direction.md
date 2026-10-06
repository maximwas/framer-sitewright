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

- Sample the palette from the concept's world: two or three neutrals of its materials (or the client's photos) and one
  accent that exists in that world, locked for actions and real highlights. Three or four colors in all; each with its
  source ("stamp red: the station stamp").
- Every palette says how its background is painted: flat, a gradient (linear, radial, mesh) or a live shader (`dsl`,
  Shaders), taken like the colors from something in the concept's world whose tone changes across it (light on a wall,
  the sky, water, a fading print) and named with that source; flat when nothing there does.
- Color may change with the content when the concept asks for it: one per chapter, per item, per time of day.
- Muted text as its own token in the base's tone, checked at AA (`contrast_check`) on every background it sits on: a
  60% tint of the ink often fails.
- An accent that fails 4.5 : 1 as small text (an ochre at 3.2 : 1 on cream) stays on large type, fills and icons.
  Small accent text gets its own darker token of the same hue (`Accent/Text`, 5 : 1).
- A surface that keeps its color in both themes (a paper ticket, a label, a receipt, a brand-colored band) needs text
  tokens that also keep theirs: give its ink the same light and dark value. A shared ink token turns light on it in
  the dark theme, and Framer's linter flags the contrast.
- Make a boundary between sections an event when the concept has one: sticky panels that stack over each other, a
  pinned crossfade, full-height color panels, a graphic layer between sections. Otherwise a change of background, not
  a border.
- Neutrals of one temperature; tinted shadows, never pure black.

## Imagery

- **Media covers about half of a top site's page (median 47%).** A page needs a visual system: photos, the product's
  real interface with one believable sample dataset (for software it is often the best hero), one protagonist object
  followed through the page, or a graphic system that unifies everything (halftone, line raster, contour lines). Text
  alone reads unfinished, not minimal.
- One art direction, written as one sentence: light, distance, subject, treatment. Invented dashboards and fake
  interfaces read as generated; real UI with believable data does not.
- Asset order: the client's own material, then stock (`images_search` with a key, or `image_upload` by URL), then a
  clearly named placeholder frame with the size it needs — and tell the user. Never fill the gap with icons.
- **Photos from the subject's world, in one art direction:** warm, natural light, candid shots of the places and people
  the client serves, at work. Never posed studio portraits, corporate headshots against glass, gadgets on a bed, or
  brand logos (browser and app icons) in a template. A picture set between words shows those exact words.
- **Choose by looking, not by captions:** pull about eight candidates per slot, put their thumbnails side by side (one
  contact sheet) and pick; one shoot per slot, so two cards never show the same people. Before handover look at every
  photo of the site together: the same person in two different files passes every file check.
- **People must read:** a testimonial or a contact block shows the person plainly, in a setting that fits their role.
  Crop portraits tight (an Unsplash URL takes `&rect=x,y,w,h` or `&crop=faces`) and look at the crop at its real size.

## Looks that read as generated (avoid as defaults)

- Palettes that need a reason from the subject and read as generated without one: cream + display serif + terracotta;
  near-black + one acid green (the 2025 Site of the Year uses it because it is the client's racing livery); beige +
  brass for "premium"; purple-to-blue glows, gradient text, a permanent dark theme with purple and low-contrast grey.
- Template chrome: an uppercase tracked label above every heading; a pill badge above the H1 ("New", "AI-powered");
  section numbers 01/02/03 when the items are not steps; an icon in a colored square above every card title; a colored
  border on one side of cards; colored dots before items; `→` after every link; emoji as icons.
- 2026's template chrome, fine only with a reason from the concept: city clocks in the header when time zones do not
  matter; a floating "talk to us" card with an avatar on every page; a giant wordmark footer as filler; a video hero
  with the headline bottom-left as the default; a full-height section whose content does not need it (chapter openers
  may). Banning a default brings the next one (Inter → Space Grotesk → Satoshi or General Sans): choose from the
  concept, not by elimination.
- Structures: six identical feature cards; cards inside cards inside cards; a statistics row of round numbers ("10x",
  "99.9%"); "How it works" steps 1-2-3 for something that has no steps; the same section skeleton everywhere;
  everything symmetric, every split 50/50.
- Uniformity: the same padding 24, radius 16 and gap 24 at every level; everything weight 500–600 at 16/20/32/48 with
  nothing dominating.
- Effects: glows and blurred blobs behind the hero, pulsing dots and scanning lines, the same fade-up on every section.
- Copy: H2s that all start the same way ("Everything you need to…", "Built for…"); confident but empty lines that fit
  any company; generic names (Acme), filler verbs (elevate, seamless, unleash); a different label for the same action;
  a past year in the footer.
- Copy tells: "not X but Y" and "not only… but also"; lists of three by habit; em dashes and bold everywhere; puffery
  (nestled, in the heart of, groundbreaking, vibrant, pivotal, delve); Title Case Headings. Test each headline: can a
  reader picture it, could it be proven false, could nobody else say it? Three no's: rewrite it from the claim and the
  customers' own words.
- Framer defaults left in place: centered everything (stacks center by default), blue text links, a header wider than
  the content, one gap for heading, text and buttons.

## Vocabulary: write in the concept's language

- Name things inside the world: products, tiers, sections, the newsletter, the team page (a studio's tiers as
  Lightfish, Quickfish and Heavyfish; services named after the stations an order passes).
- Microcopy in the world's units ("lead time 11 → 4 days"), the 404 as a small story in the concept, the footer line
  and the cookie banner in the brand's voice.
- One second-read detail people find on a second look. Keep forms, navigation labels, prices and legal text plain.
- No invented testimonials, logos or numbers on a client's site: placeholders are marked and listed at handoff (on a
  template they are realistic placeholder content buyers replace).

## Before building, check the plan

Ask of each part of the plan: would any similar brief get this? If yes, change it, and say what changed and why.
