---
name: framer-craft
description: >
  Use when building or editing a Framer site with the official Framer agent (npx @framer/agent,
  framer.agent.applyChanges), together with the `framer` skill: pages, sections, breakpoints, tokens, text styles,
  components, variants, motion, scroll effects, menus, CMS, forms, images, metadata, a Figma import or a Marketplace
  template, or when Framer accepts a change without an error and it still renders wrong.
---

# Framer craft

What the `framer` skill (the CLI, the DSL grammar, Framer's design rules) leaves out. Unmarked rules were seen on live
projects and describe what Framer actually does where its reference disagrees; **Practice** marks the method of
experienced Framer creators and Framer's help center.

## Workflow

0. **Tell the request apart.** Help with one part reads the project and builds only that part in its existing tokens,
   styles and components. A fix changes exactly what was asked, nothing around it, and is read back and checked on
   every breakpoint. When unsure which, ask.
1. Connect and read the project's `index.md` task map, as the `framer` skill says.
2. Read before you write: `framer.agent.serialize({ id, depth })` for the part you change,
   `framer.agent.readComponentControls` for control names, `listIconSets` + `readIcons` for icons. Never guess ids,
   control names or icon names.
3. Build in order: design system (tokens, text styles), the page frame and breakpoints, sections with one
   `applyChanges` batch each, then motion. Before building anything that moves or responds, write its states list
   ([motion.md](references/motion.md), States first).
4. After each batch, fix every entry in `errors` and read `warnings` and `linter`. The rest of the batch is already
   applied: fix a failed `+` command's node by `SET` on its real id, since re-sending it duplicates nodes. Read back
   what Framer rewrites or drops without an error ([verify.md](references/verify.md)).
5. Screenshot every breakpoint. Then open the published site (or Preview) in a real browser and go through every
   states list ([verify.md](references/verify.md), Behaviour in a real browser): screenshots never run effects or show
   a change of state.
6. Publish only when the user asks.

## Rules for every batch

- **Whole numbers** for px sizes, pins, gaps, paddings, gradient percentages and fr weights (569.15px → 569px), and an
  `aspectRatio` whose height × ratio comes out whole.
- **No fixed widths on content:** `width="1fr"` with `maxWidth`; `aspectRatio` with a px height for proportions.
- **Text color is a token on the text node** (`textColor="var(--token-<id>)"`), even when its text style has the color:
  only then does the token show in the editor's Color field. Write it in the same `SET` as `textStylePreset`, which
  drops a `textColor` set earlier.
- **The text style owns typography:** with `textStylePreset` set, `fontSize`, `letterSpacing` and the other style
  properties are refused. Setting `text` on a variant or breakpoint copy drops the style: repeat `textStylePreset` in
  the same `SET`.
- **New nodes go last in their parent:** give `index` whenever order matters, or a new section lands after the footer.
- **Absolute and fixed layers** take px or % sizes, never `fr`, and px pins; to stretch or center one, follow
  [layout.md](references/layout.md), Absolute layers.
- **Links:** external ones start with `https://` (`www.…` becomes a relative path); section links need their target,
  smooth scroll and a scroll margin ([layout.md](references/layout.md), Navigation and links).
- **No effects or `scale` on a variant root or a breakpoint root, and no `aspectRatio` on a variant root:** use a
  gesture variant or a child, and give the `aspectRatio` to the instance. Breakpoints take only `flowEffect` and
  `pageEffects`.
- **Hover** writes `hoverEffect.scale="1"` (or Framer fills in 1.1) and changes one thing, only on what is clickable.
  **Loop** writes `loopEffect.rotate="0"` (a new loop spins 360°).
- **Springs only, without bounce:** physics where Framer keeps it, a time spring elsewhere; the one exception is a
  progress indicator that shows time ([motion.md](references/motion.md)).
- **Things that open** (accordion, menu, dropdown) animate their height, never `visible`, which pops even in Framer's
  own FAQ example ([motion.md](references/motion.md)).
- **A temp id lives for the whole session.** Never reuse one, even after `DEL`.
- **Visuals:** photos in one art direction, picked side by side ([assets.md](references/assets.md)); icons are
  interface, never a section's visual.
- **Code** (code components, custom code, overrides): only in the cases [components.md](references/components.md),
  Code components, names, and say which one first.

## References

Before writing DSL, read the reference that matches the task:

| Task | Read |
| --- | --- |
| Structure, widths, stacks, grids, absolute layers, breakpoints, z-index, sticky, navigation and links | [layout.md](references/layout.md) |
| Tokens, text styles, fonts, folders, deleting styles | [design-system.md](references/design-system.md) |
| Components, variants, controls, clicks, page state, Framer's own and code components | [components.md](references/components.md) |
| Anything that moves or responds: states list, springs, hover, things that open, overlays, page transitions | [motion.md](references/motion.md) |
| Scroll transforms and variants, pinned steps, scroll scenes | [scroll.md](references/scroll.md) |
| CMS, forms, Repeat | [cms-forms.md](references/cms-forms.md) |
| Photos, shaders, icons, logos, favicon, metadata | [assets.md](references/assets.md) |
| A Figma design into Framer | [figma.md](references/figma.md) |
| Checking results, rewritten values, stale sessions, behaviour in a real browser | [verify.md](references/verify.md) |
| Before launch: responsive, speed, SEO, accessibility, content, handoff | [quality.md](references/quality.md) |
| A Marketplace template: Framer's checklist, buyer-editable structure, the listing | [marketplace-template.md](references/marketplace-template.md) |
