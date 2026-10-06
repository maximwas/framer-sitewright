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
   two or three directions from the Marketplace when there are none.
6. **Mood** in three words: calm and editorial, bold, precise and technical, warm, quiet luxury, playful (one that
   follows from the purpose).
7. **Palette:** *propose* three palettes for this purpose and mood, each with background, surface, text, muted text,
   line, accent and text on the accent as hex, with AA contrast; brand colors as one more option (the first one).
8. **Theme:** light, dark, or both following the device; both means a dark value on every token (light only).
9. **Assets:** logo (SVG), photos, video, icons: all, logo only, or nothing yet (stock and named placeholders, listed
   at handoff; a drawn SVG mark without a logo).
10. **Copy:** given, written by you, or placeholders, and in which language (real copy in the site's language, never
    lorem ipsum).
11. **Motion level:** subtle, balanced or expressive, with the effects each adds ([motion.md](motion.md)) (balanced).

**Recommended:** audience and what they must believe before acting; fonts (*propose* two or three pairings); imagery
(photography, product shots, illustration, 3D, video in the hero); CMS (*propose* the collections and their fields
for content that repeats or grows); languages (one); features such as a contact form, booking, newsletter, store or
search, saying up front what needs code (a contact form); SEO (old addresses to redirect, words to be found by); who
edits after launch and the deadline (someone new to Framer: clear names, components, CMS).

**Optional:** domain and Framer plan (build within the plan, say what needs a paid one); screens that matter most
(1440, 1280, 810, 390, all finished); analytics beyond Framer's own (none: scripts are custom code); accessibility
(WCAG AA contrast, alt text, visible focus).

## 1b. Look at the market (Practice)

- Before proposing directions, look at what sells now in the brief's category on the Framer Marketplace (with
  Sitewright: `marketplace_browse`). Name what the best ones do that a merely correct page lacks: type scale, image
  size, section rhythm, motion.
- For carousels, tickers and effects, offer two or three free Marketplace components with previews, or a native build
  with variants, and let the user choose.
- Offer a motion level too (subtle, balanced, expressive) with the effects per section ([motion.md](motion.md)).

## 2. Propose directions, not pages

- **Show 2–3 directions, never more.** More options give mixed feedback that is hard to apply.
- **Each direction is a style tile:** one frame with the palette, the type pairing at real sizes, a button, a card, a
  photo or illustration treatment, and one sample hero line. The directions must differ in font, mood, color and
  component style, not in nuance.
- **Build the tiles in Framer**, on a design page that is not published:

  ```text
  +DesignPageNode directions name="Directions";
  +FrameNode tileA parent="directions" name="A — Calm editorial" layout="stack" stackDirection="vertical" gap="32px" padding="48px" width="720px" height="auto";
  ```

  Tokens and text styles for a direction can live under a folder (`A/Text/Primary`) until one is chosen; then delete
  the others' folders (see [design-system.md](design-system.md), folders and deleting).
- **Before showing them,** check each direction against the generated-looking defaults in
  [distinct-design.md](distinct-design.md) and revise what reads as a default.
- **Present each tile with one sentence** on why it fits the brief, and ask the user to judge tone, type, color and
  component style, not layout.

## 3. Design system before pages

Once a direction is chosen:

- **Spacing on an 8 px scale:** 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Use the same few values for gaps and section
  padding across the site. Inner spacing is never larger than outer spacing.
- **Type scale with a fixed ratio:** 1.2 (dense UI), 1.25 (most sites) or 1.333 (expressive). Body 16–18 px, line
  height 1.4–1.6 for body, 1.0–1.2 for display. Two families at most (heading and body), two or three weights each.
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
