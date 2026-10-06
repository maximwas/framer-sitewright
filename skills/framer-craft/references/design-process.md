# Designing from scratch

How to go from a brief to a site people want to keep editing. Framer's own reference (`implementation-strategy.md` in
the project prompt) says when to ask the user and which category patterns fit; this file adds the working method.
Everything here is **Practice** (Framer's docs and experienced creators) unless it says otherwise.

## 1. Brief

Before any canvas work, run the brief with the user (with Sitewright: `project_brief`, which also saves the answers
with the project). Skip what the user already said. Ask in rounds of up to four questions, essentials first, each with
concrete options. Where a question says *propose*, make the proposals for this project instead of asking an open
question. A skipped question, or "decide yourself", takes the fallback in brackets: say which.

**Essentials** (nothing starts without them):

1. **Purpose and main action:** leads (book a call), sell a product (sign up, buy), portfolio, launch or event
   (waitlist), content. Decides the structure and the call to action.
2. **Whose site:** a client's, the user's own, or a Framer Marketplace template, which follows
   [marketplace-template.md](marketplace-template.md) (the user's own).
3. **Name** and tagline (a working name, marked as a placeholder).
4. **Pages:** one page or a sitemap (home and a 404, plus legal pages with a form).
5. **References:** sites they like and what exactly in each, sites they dislike, a brand book or Figma file. *Propose*
   two or three references from award galleries and from outside the category when there are none (1b).
6. **Voice** as three "X but not Y" pairs (warm but not cute) plus words to use and avoid, not mood adjectives: "quiet
   luxury" and "calm and editorial" produce the generated looks (pairs that follow from the purpose).
7. **Palette:** proposed inside each concept (§2): background, surface, text, muted text, line, accent and text on the
   accent as hex, with AA contrast; brand colors when they exist (the first option).
8. **Theme:** light, dark, or both following the device; both means a dark value on every token (light only).
9. **Assets:** logo (SVG), photos, video, icons: all, logo only, or nothing yet (stock and named placeholders, listed
   at handoff; a drawn SVG mark without a logo).
10. **Copy:** given, written by you, or placeholders, and in which language (real copy in the site's language, never
    lorem ipsum).
11. **Motion level:** subtle, balanced or expressive, with the effects each adds ([motion.md](motion.md)) (balanced).

**Recommended:** **positioning**: what the visitor would use instead (the alternatives), what is genuinely different,
the proof that exists (cases, numbers, reviews) and how success is measured; the claim comes from it, each section
proves one difference, and the alternatives' objections become the FAQ. Audience and what they must believe before
acting; fonts (proposed inside each concept); imagery
(photography, product shots, illustration, 3D, video in the hero); CMS (*propose* the collections and their fields
for content that repeats or grows); languages (one); features such as a contact form, booking, newsletter, store or
search, saying up front what needs code (a contact form); SEO (old addresses to redirect, words to be found by); who
edits after launch and the deadline (someone new to Framer: clear names, components, CMS).

**Optional:** domain and Framer plan (build within the plan, say what needs a paid one); screens that matter most
(1440, 1280, 810, 390, all finished); analytics beyond Framer's own (none: scripts are custom code); accessibility
(WCAG AA contrast, alt text, visible focus).

## 1b. Look at the market (Practice)

- **Conventions from the Marketplace, ideas from elsewhere.** Look at what sells now in the brief's category on the
  Framer Marketplace (with Sitewright: `marketplace_browse`) for the category's conventions and production level: type
  scale, image size, section rhythm, motion. Templates never give the idea: they are concept-free by definition, and
  Framer asks templates to be original. Take references from award galleries (Awwwards Sites of the Day and Month,
  Framer Awards, SiteInspire, Recent/Godly) and from outside the category, and name each one's concept, signature and
  vocabulary.
- For carousels, tickers and effects, offer two or three free Marketplace components with previews, or a native build
  with variants, and let the user choose.
- **Before offering a Marketplace component, check it without a cursor and without the canvas.** Trails, tilts and
  magnetic effects do nothing on touch: give their area a background of its own and hide cursor hints on phone. On the
  canvas, counters show 00 and reveals show their end state: check them in Preview. Turn off debug defaults (Circular
  Spin Text ships `showHitAreaGuide` on) and calm loud ones (Noise Grain at its default opacity 0.5 dirties text;
  0.1–0.12 works). Scroll-pinned carousels take over the scroll: not for product lists. A smart component keeps its own
  fonts, colors and transition: make it local and restyle it (`framer.agent.makeExternalComponentLocal`; Sitewright
  `component_make_local`), or build it natively. Marketplace components expose no events, so they cannot set page
  variables or drive each other.
- Offer a motion level too (subtle, balanced, expressive) with the effects per section ([motion.md](motion.md)).

## 2. Concept before style

A designed page can be said as "X as Y" in twelve words or fewer: an archive as a stack of magazines, a commodity
group as a descent from a summit, a bike workshop as a truing stand. That sentence decides the first screen, one
signature moment, the names and the proof. Palette and type come after it and cite it.

1. **World:** twenty nouns of the subject's world (objects and tools, places, materials, units and numbers, rituals and
   jargon), plus the client's real assets (photos, people, documents, places).
2. **Claim and unit:** one sentence for what is different (from the positioning), and the unit a customer feels it in
   (days of lead time, hours saved, millimetres, euros).
3. **Three concepts from different archetypes:** the product's medium as the page; the name or place taken literally;
   one protagonist object; a borrowed format (ticket, cover story, shelf); a manifesto as the opening scene; the
   client's visual vernacular; a collision of two worlds; one unit of value; a reward for exploring; a duality. Strong
   pages pair one structural archetype (the first four) with one voice archetype.
4. **A card per concept:** spine; first screen (explain or evoke, the image or object, where the plain description
   sits); signature (start → trigger → end, its phone and no-motion versions, how it is built); vocabulary (section
   names, the one button label, footer line, 404, cookie line, in the voice's pairs); proof form in the unit; ending;
   what stays plain (navigation, prices, forms, legal).
5. **Six tests:** swap (if a competitor's logo still fits, make it specific with the client's places, people and
   numbers, or drop it); footer (the hero predicts the footer and the 404); one sentence; touchpoints (first screen,
   signature, vocabulary, proof form, ending); restraint (absent from navigation, forms, prices, legal); truth (the
   signature shows the real claim, not decoration).
6. **Present** the three as style tiles (2b).

## 2b. Show the concepts as style tiles

- **Show the three concepts, never more.** More options give mixed feedback that is hard to apply.
- **Each tile is one concept:** one frame with its hero line and the palette, type and component style it implies (the
  type at real sizes, a button, a card, a photo or illustration treatment). Tiles differ in idea first.
- **Build the tiles in Framer**, on a design page that is not published:

  ```text
  +DesignPageNode directions name="Directions";
  +FrameNode tileA parent="directions" name="A — Archive as a stack of issues" layout="stack" stackDirection="vertical" gap="32px" padding="48px" width="720px" height="auto";
  ```

  Tokens and text styles for a concept can live under a folder (`A/Text/Primary`) until one is chosen; then delete
  the others' folders (see [design-system.md](design-system.md), folders and deleting).
- **Before showing them,** check each tile against the generated-looking defaults in
  [distinct-design.md](distinct-design.md) and revise what reads as a default.
- **Present them side by side on the same content,** one sentence per tile on why it fits the brief. Recommend one and
  say why, and ask which best serves the goal, not which they like; let the user judge tone, type, color and component
  style, not layout. Build the one picked. Never merge two.

## 2c. Page outline

- **Before the design system,** write each section's job, headline, proof and call to action, in the site's language
  and in the voice, and agree it with the user. It becomes the copy of the grayscale wireframe (§4).

## 3. Design system before pages

Once a concept is chosen:

- **Spacing on an 8 px scale:** 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Use the same few values for gaps and section
  padding across the site. Inner spacing is never larger than outer spacing.
- **Type scale by role, not by one ratio:** body 16–18px, line height 1.4–1.6. A fixed 1.25 ratio from a 16px body
  stops near 49px after five steps and reads flat. Make the largest heading at least about 4× the body unless the
  product or a photo is the display: explain heroes 48–86px beside the product, evoke heroes 124–240px at 1440. Large
  sans tracks −0.02…−0.06em; uppercase labels +0.04…+0.12em; body 0. Display line height 0.9–1.1, never below about
  0.9 where accents or Cyrillic stack: test the longest real headline on every breakpoint. A workhorse and at most two
  voices, two or three weights each.
- **Text styles per role** (`Heading 1`…`Heading 4`, `Body`, `Body Small`, `Label`, `Button`), each with breakpoint
  slots (see [design-system.md](design-system.md)).
- **Color:** a neutral base, one text color plus a muted one, one accent used only on key actions and highlights. Name
  tokens by role (`Text/Primary`, `Surface/Raised`, `Brand/Accent`), never by hue. Give every token a dark value when
  the site may get a dark mode.
- **Radius and elevation scale:** pick one radius for cards and buttons and a smaller one for nested elements, so the
  corners are concentric; one or two shadows at most.
- **Readable measure:** body text 50–75 characters per line, about `maxWidth="640px"`–`"720px"` at 16–18 px.
- **Field-tested:** whole numbers everywhere, tokens on text nodes, `1fr` + `maxWidth` widths (SKILL.md).

## 4. Wireframe, then style

- **Grayscale first.** Lay the sections out with real copy (or realistic placeholder copy) in neutral colors, on the
  page's breakpoints. Agree on structure and order before color and imagery.
- **Then apply the system:** text styles, tokens, imagery, icons, components.
- **Then motion,** last and sparingly.

## 5. Components and reuse

- Anything that repeats becomes a component (see [components.md](components.md)). Shared chrome (header, footer)
  lives in a layout template.
- Expose as controls everything the client will edit: text, image, link, icon, variant.

## 6. Handoff

- **Project skill for the next agent** (Practice, Framer Academy): Framer projects can hold skills, instructions for
  Framer's agents. When the site will be maintained by agents, add one with the conventions: naming, which tokens and
  text styles to use, section structure, what must be preserved (copy, links, CMS bindings, interactions), checks
  before finishing. The DSL has `+SkillNode` with `description`, `instruction` and `trigger` (`always` or
  `on-demand`). Keep one rule per bullet; say **must**, **prefer** or **can**.
- **Client handoff checklist:** access and roles, how to edit text, images and CMS items, how to publish, SEO fields,
  do's and don'ts for the design system.
- Run the quality checklist first ([quality.md](quality.md)).
