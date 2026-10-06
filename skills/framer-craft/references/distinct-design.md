# Designed, not generated

How to keep a site built from scratch from looking like every other AI-made page. **Practice**: drawn from
Anthropic's `frontend-design` skill, popular anti-default design skills and experienced creators, adapted to Framer.
Where the user's brief names a look, the brief wins, even if it is on the list below.

## Start from the subject, not from a template

- **Name the subject first:** what the product or person is, who it is for, and the page's one job. If the brief does
  not say, propose them and confirm.
- **Distinctive choices come from the subject's world:** its materials, tools, vernacular, places, colors. A site for
  a ceramics studio and one for a trading desk must not share a palette or a type pairing.
- **Open with the most characteristic thing** of that world: a photograph, a product, a headline set as an image, a
  live demo, a number that matters. A big number with a small label and a gradient accent is the default; use it only
  when it truly is the best opening.

## Plan, then check the plan against the defaults

Before the first `applyChanges` for a new site, write a compact plan (it is also the style tile of
[design-process.md](design-process.md)):

1. **Spine:** the chosen concept's "X as Y" and its claim with its unit ([design-process.md](design-process.md),
   concept).
2. **Color:** 4–6 named values with hex: two or three neutrals of the world's materials and one accent that exists in
   that world, sampled from the chosen photos when you have them. Name each after its source (`Stamp Red`: the station
   stamp). A palette from the list below needs such a reason: the 2025 Awwwards Site of the Year is near-black with
   acid lime because that is the driver's livery.
3. **Type:** a workhorse plus up to two voices, each with a job named in the concept.
4. **Layout:** alignment, container, section rhythm.
5. **Imagery:** one sentence for light, distance, subject and treatment.
6. **Signature and one motion verb** (descend, stack, settle, stamp): the concept made physical by one interaction,
   with a phone version and a no-motion version. Spend the boldness there and keep the rest quiet.

**Vocabulary:** name sections, products and tiers inside the world. Write the 404, the footer line and the cookie
banner in the voice, and add one detail people find on a second look. Keep navigation, forms, prices and legal text
plain.

Then ask of each part: would I produce this for any similar brief? If yes, change that part and say what changed and
why. Only then build.

## Looks that read as generated

Avoid these unless the brief asks for them. They are fine as choices, not as defaults.

- **Palettes** (each needs a reason from the subject):
  - warm cream background, a display serif and a terracotta or clay accent;
  - near-black background with one acid-green or vermilion accent;
  - beige or cream with brass, ochre or oxblood for anything "premium";
  - purple-to-blue glows and neon gradients, gradient text on big headlines.
- **Layouts:**
  - the broadsheet look with hairline rules, zero radius and dense columns;
  - the card kit: everything chopped into identical rounded cards with the same soft grey shadow, gradient washes as
    decoration;
  - a row of three identical feature cards; a centered hero on every brief.
- **Template chrome:**
  - a tracked-out ALL-CAPS label above every heading;
  - section numbers as labels (01 / 02 / 03, 001 · Capabilities) when the content is not a sequence;
  - meta strings joined with middle dots, labels built with a spaced em dash, `→` appended to every link;
  - a monospace face for small labels, version pills (BETA, v2.0) in the hero, colored dots before every item;
  - one word in a headline set in another color, italic or font just to add interest.
- **2026's template chrome,** fine only with a reason from the concept: city clocks in the header when time zones do
  not matter; a floating "talk to us" card with an avatar on every page; a giant wordmark footer as filler; a video
  hero with the headline bottom-left as the default; a full-height section whose content does not need it (chapter
  openers may). Banning a default brings the next one (Inter → Space Grotesk → Satoshi or General Sans): choose from
  the concept, not by elimination.
- **Type:** Inter as the automatic choice; the same two display serifs every model reaches for (Fraunces,
  Instrument Serif); oversized headlines that only shout.
- **Content:**
  - generic names (Acme, Nexus, John Doe), filler verbs (elevate, seamless, unleash, revolutionize);
  - suspiciously round numbers (99.99%, 10x);
  - a different label for the same action on one page ("Get in touch", "Contact us", "Let's talk");
  - copy tells: "not X but Y" and "not only… but also"; lists of three by habit; em dashes and bold everywhere;
    puffery (nestled, in the heart of, groundbreaking, vibrant, pivotal, delve); Title Case Headings. Test each
    headline: can a reader picture it, could it be proven false, could nobody else say it? Three no's: rewrite it from
    the claim and the customers' own words.

## Typography

- **A workhorse plus up to two voices, each with a job named in the concept** (headlines and readouts, quotes, data, the
  maker's hand); many award winners use three faces this way. A superfamily (one designer, several widths) pairs most
  reliably. Use the same family's italic or weight for emphasis, not another face.
- **Reach past the convergent picks** (Inter, Geist, Satoshi, General Sans, Switzer, Instrument Sans and Serif,
  Fraunces) and choose from what the concept needs. Search candidates by name (`{ type: "font-search", name: "…" }`;
  search by description spends AI credits, see [design-system.md](design-system.md)). Framer's Open Source category
  (Collletttivo, Velvetyne) is distinctive and safe for templates. Check the script and signs first
  ([design-system.md](design-system.md), fonts).
- **License:** Google and Framer's library fonts are free for client sites and templates. Fontshare's closed fonts (ITF
  FFL v2.0, 17 Aug 2026) come only from Framer's built-in library or from a copy the client downloads: never upload
  the files for someone else or into a template, never subset or convert them. Retail fonts need a webfont license in
  the client's name, and trial cuts go only on unpublished pitch pages. Credit OFL foundries that ask (Velvetyne) in a
  colophon.
- **Type is part of the design:** a headline can be the image. Set the scale, weights and spacing on purpose.
- **Line length under 80 characters;** serif body text gets a little more line height than sans.

## Color

- **One accent, locked for the whole page.** It goes on actions and real highlights only.
- **An accent that fails 4.5 : 1 as small text** (an ochre at 3.2 : 1 on cream) stays on large type, fills and icons.
  Small accent text gets its own darker token of the same hue (`Accent/Text`, 5 : 1).
- **Neutrals of one temperature.** Do not mix warm and cool greys.
- **Saturation kept moderate;** a slightly off-black and off-white rather than pure #000 and #fff.
- **Shadows tinted** toward the background hue, never pure black on a light page.
- **Build the palette from the subject:** the client's photography, product, materials. Check every pair for contrast
  ([quality.md](quality.md)).
- **Text on a colored or dark background** takes a token of that background's hue, never grey text at reduced opacity.
  Check it at 4.5:1 (3:1 at 24px and up) on every background it sits on: a muted token at about 60% of the ink often
  fails on tinted backgrounds.

## Shape and structure

- **One radius rule for the page:**
  - all sharp, all soft (12–16 px) or pill buttons with soft cards;
  - nested elements get a smaller radius;
  - write the rule down and follow it everywhere.
- **Cards only when elevation means hierarchy.** Otherwise group with space, a divider or a background band.
- **Structural devices carry information.** Numbers mark real sequences, labels name real categories, dividers
  separate real groups.
- **Vary the compositions:** split screens, left-aligned copy with an image on the right, asymmetric white space, a
  pinned scroll scene. Not every section centered.

## Motion

- **One orchestrated moment** (a load sequence, a scroll scene) lands better than a fade-up on every section and a
  hover on every card.
- Motion that answers a person's action (opening, expanding, confirming) is always welcome.
- Durations and limits are in [motion.md](motion.md).

## Copy

- **Write from the visitor's side:** say what something does, in plain words, sentence case.
- **A button says what happens** ("Book a call", "Download the guide"). One label per intent, used everywhere on the
  page.
- **Realistic placeholders, marked and listed at handoff:** believable names, places and numbers (47 clients, 4.8
  rating). Real proof (quotes, people, numbers, logos) only from the client ([sections.md](sections.md), social proof).
- **Fewer words.** Each element does one job.

## Images and assets, not icons everywhere

Generated pages lean on icons because finding real visuals costs effort. That is exactly what makes them look
generated.

- **Icons are interface, not illustration.** Use them for actions, navigation, lists and small feature markers:
  - one set, one stroke width, at body-text size;
  - never as the main visual of a section, a hero or a card;
  - never in a row of icon-plus-title cards for every section.
- **A page needs a visual system:** the client's photos, the product's real interface with one believable sample
  dataset (for software often the best hero), one protagonist object followed through the page, or a graphic system
  that replaces or unifies the images (halftone, line raster, contour lines, black and white). Text alone reads
  unfinished; stock alone reads generic, and one treatment makes mixed sources look like one shoot.
- **Asset order, cheapest and truest first:**
  1. **The client's own material:** brand photos, product shots, real screenshots, the logo as SVG. Ask for them in the
     brief ([design-process.md](design-process.md)).
  2. **Stock photography through Framer:** `framer.agent.queryImages` (Unsplash), one query per section, `count: 3`
     (up to three results come with thumbnails you can see), `width` twice the frame width. Keep one art direction
     across the site: same light, color temperature and framing. Save chosen URLs in `state` and reuse them.
  3. **Framer shaders** for atmosphere instead of gradient blobs: `+ShaderNode` with a name from the project's
     `<available-shaders>` (mesh, liquid gradient, wave gradient, fluted glass, particles…). Read its controls first
     (`readShaderControls`), tint it with the palette, one per page, and check speed on phone. Placement, colors and
     image shaders: [assets.md](assets.md), shaders.
  4. **Logos:** the client's real clients, with permission; in a template, invented marks. One neutral color, logos
     only (no category labels under them). An invented brand gets a simple monogram or wordmark uploaded as SVG
     ([assets.md](assets.md)), not a text label.
- **No fake product screenshots built from frames.** Use a real screenshot, a real working component, or photography.
- **When nothing fits,** leave a clearly named placeholder frame (`Hero photo — needed, 1600 × 1200`) and tell the user
  which images are needed and where. Do not fill the gap with icons.

## Review like a designer

- **Screenshot every section** and every breakpoint, then look at the page as a whole before calling it done.
- **Remove one accessory:** before finishing, cut the decoration that serves the least.
- **Keep a note** in the project skill or the conversation of what this site's signature is, so later changes keep it.
