# Designing from scratch

How to go from a brief to a site people want to keep editing. Framer's own reference (`implementation-strategy.md` in
the project prompt) says when to ask the user and which category patterns fit; this file adds the working method.
Everything here is **Practice** (Framer's docs and experienced creators) unless it says otherwise.

## 1. Brief

Before any canvas work, settle these with the user. Ask only what is still open, and offer concrete defaults.

- **Goal of the page or site:** one primary action (sign up, book a call, buy, contact).
- **Audience and tone:** premium, playful, bold, minimal, editorial, technical.
- **Pages and content:** a sitemap, who supplies copy and images, what is a CMS list (blog, cases, team, jobs).
- **Brand assets:** logo (SVG), fonts, colors, photography. Missing ones become part of the proposal.
- **Motion appetite:** none, subtle, or expressive. This decides the motion budget (see [motion.md](motion.md)).
- **References:** two or three sites the client likes, and what exactly they like in each.

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
