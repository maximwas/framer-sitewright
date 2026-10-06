---
name: framer-craft
description: >
  Field-tested rules for building Framer sites with the official Framer agent (npx @framer/agent, the
  framer.agent.applyChanges DSL). Use together with the `framer` skill whenever you create or edit pages and sections,
  responsive breakpoints, color tokens and text styles, components and variants, hover, appear, loop or scroll motion
  and scroll scenes, accordions and menus, CMS lists, forms, icons, logos, images or site metadata, design a site from
  scratch or propose design directions, or move a Figma design into Framer. It covers what Framer's own reference
  leaves out: a design process, section patterns and a motion system used by experienced Framer creators, conventions
  that keep a project clean for the people who edit it next, and changes Framer accepts without an error that still
  render wrong.
---

# Framer craft

The `framer` skill gives you the CLI, the DSL grammar and Framer's design rules: follow it. This skill adds two things:

- **Field-tested rules:** observed on live projects. Where they and Framer's reference disagree, they describe what
  Framer actually does. Everything not marked otherwise is field-tested.
- **Practice:** the working method of experienced Framer creators and Framer's help center (design process, sections,
  motion system, scroll scenes, quality checks). Marked **Practice**; verify motion on the published site.

## Workflow

1. Connect and read the project's `index.md` task map, as the `framer` skill says. For a new site or a redesign,
   follow [design-process.md](references/design-process.md): brief, 2–3 directions, design system, grayscale
   wireframe, then style.
2. Read before you write: `framer.agent.serialize({ id, depth })` for the part you change,
   `framer.agent.readComponentControls` for control names, `listIconSets` + `readIcons` for icons. Never guess ids,
   control names or icon names.
3. Build in order: design system (tokens, text styles), then the page frame and breakpoints, then sections with one
   `applyChanges` batch per section, then motion.
4. After each batch, fix every entry in `errors` and apply again. Read `warnings` and `linter` too.
5. Read back what matters. Framer rewrites or drops some values without an error (see
   [verify.md](references/verify.md)).
6. Screenshot every breakpoint. The canvas and screenshots never run effects: appear, hover, loop and scroll motion can
   only be checked on the published or preview site.
7. Publish only when the user asks.

## Rules for every batch

- **Whole numbers.** Write px sizes, pins, gaps, paddings, gradient percentages and fr weights without fractions:
  569.15px from a design becomes 569px. Pick an `aspectRatio` whose height × ratio comes out whole.
- **No fixed widths on content.** Use `width="1fr"` with `maxWidth`. Use `aspectRatio` with a px height for
  proportions.
- **Text color is a token on the text node.** Set `textColor="var(--token-<id>)"` on the `RichTextNode` itself, even
  when its text style already has the color. Only then does the token show in the editor's Color field.
- **The text style owns typography.** With `textStylePreset` set, `fontSize`, `letterSpacing`, `textDecoration` and
  other style properties are refused.
- **New nodes go last in their parent.** Give `index` whenever order matters, or a new section lands after the footer.
- **Absolute and fixed layers** take px or % sizes, never `fr`. Pins (`left`, `right`, `top`, `bottom`) take px only.
- **To stretch an absolute layer** over its parent, pin all four sides to `0px`. Do not use width and height 100%, and
  never `auto`: the layer collapses. **A component instance is the exception:** pinned, it keeps its own size (`auto`
  by default) and collapses to its content; give it `width="100%" height="100%"` with the pins.
- **To center an absolute layer**, set `centerAnchorX="50%"` (or `centerAnchorY`) with no pins on that axis. Framer
  refuses to create an absolute node without pins, so create it pinned. Then, in a second `SET`, set those pins to
  `null` and add the anchor.
- **Anchor links:** a link to `/#id` needs the target to have `elementId` and `scrollTargetEnabled="true"` first.
  Setting them earlier in the same batch works.
- **Text on a variant or breakpoint copy:** setting `text` silently drops its text style. Repeat `textStylePreset` in
  the same `SET`.
- **No effects or `scale` on a variant root or a breakpoint root.** Framer refuses them there. Use a hover or pressed
  gesture variant, or put the effect on a child. Breakpoints take only `flowEffect` and `pageEffects`.
- **Hover:** always add `hoverEffect.scale="1"`. Without it Framer fills in 1.1 and the element jumps.
- **Loop:** always add `loopEffect.rotate="0"`. A new loop starts from a preset that spins 360°.
- **Things that open** (accordion, menu, dropdown) animate their height, not `visible`. Framer's own FAQ example uses
  `visible="false"`, and that pops. See [motion.md](references/motion.md).
- **A temp id lives for the whole session.** Never reuse one, even after `DEL`. Use fresh names in every batch.
- **Code** (code components, custom code, overrides) only when the user asks for it, or when the canvas cannot do the
  task. In that case, explain why before you write any code.
- **Icons are interface, not illustration** (Practice). A section's visual is a real image, product shot, shader or
  type, never an icon; when no asset fits, leave a named placeholder and tell the user. See
  [distinct-design.md](references/distinct-design.md).
- **Confirm destructive changes** first (also a rule of the `framer` skill).

## References

Before writing DSL, read the reference that matches the task:

| Task | Read |
| --- | --- |
| A new site or redesign: the brief questions, proposing 2–3 directions, design system, wireframe, handoff | [design-process.md](references/design-process.md) |
| Making it look designed, not generated: subject-led direction, AI-default looks to avoid, type, color, real images instead of icons, copy | [distinct-design.md](references/distinct-design.md) |
| Page anatomy and blocks: hero, features, proof, pricing, FAQ, CTA, footer, navigation | [sections.md](references/sections.md) |
| Page structure, widths, stacks, grids, breakpoints, z-index, sticky | [layout.md](references/layout.md) |
| Color tokens, text styles, fonts, folders, deleting styles | [design-system.md](references/design-system.md) |
| Components, variants, controls, clicks, code-component controls, slots | [components.md](references/components.md) |
| Motion system (durations, easing, stagger), micro-interactions, page transitions, accordions, menus, springs | [motion.md](references/motion.md) |
| Scroll scenes (zoom, horizontal scroll, stacking cards, text reveal), scroll transforms and variants, pinned steps | [scroll.md](references/scroll.md) |
| CMS collections and lists, forms, Repeat (array variables) | [cms-forms.md](references/cms-forms.md) |
| Photos, icons, logos and SVG, favicon and site metadata | [assets.md](references/assets.md) |
| Moving a Figma design into Framer | [figma.md](references/figma.md) |
| Checking results, values Framer rewrites, a stale session | [verify.md](references/verify.md) |
| Before launch: responsive, speed, SEO, accessibility, content, handoff | [quality.md](references/quality.md) |
| A template for the Framer Marketplace: Framer's checklist, buyer-editable structure, the listing | [marketplace-template.md](references/marketplace-template.md) |
