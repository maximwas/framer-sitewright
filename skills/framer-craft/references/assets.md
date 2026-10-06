# Assets

## Photos

- **Stock:** `framer.agent.queryImages({ source: "unsplash", query, count, orientation })`. Ask for twice the frame's
  display width.
- **Trusted URLs:** `queryImages` also registers its URLs as trusted for the session. `applyChanges` rejects external
  URLs that went through neither `queryImages` nor `uploadImage`.
- **Placing:** `fill="<url>"` with `altText`. If the host does not serve the file, `applyChanges` fails and the node is
  created without a fill.
- **Own files:** `framer.uploadImage({ image, name, altText })` accepts an https URL, a data URL or bytes, and returns
  `https://framerusercontent.com/images/<id>`.
  - Assets are addressed by content.
  - Assets cannot be deleted through the API.
- **Images from a design:** export at 2×, cut out with alpha, save as WebP.
- **One art direction from the subject's world:** warm, natural light, candid shots of the places and people the
  client serves. No posed studio portraits, corporate headshots, gadgets on a bed, or brand logos (browser and app
  icons) in a template. A photo set between words shows those words.
- **Pick by looking:** query about eight candidates per slot, view the thumbnails side by side, and take each slot from
  a different shoot. Before handover look at every photo of the site together: the same person in two different files
  passes every file check.
- **People must read:** testimonials and contact blocks show the face plainly, in a setting that fits the role. Crop
  tight (Unsplash URLs take `&rect=x,y,w,h` or `&crop=faces`) and look at the crop at its real size.

## Shaders

- **Names:** take them from `<available-shaders>` in `framer.agent.getContext()`. Framer's "Shaders" guide writes
  `chromatic-aberration`; the shader is `chromatic`.
- **Place:** an absolute `Background` frame pinned `0px` on four sides with `pointerEvents="none"`, holding the
  `+ShaderNode` pinned the same way, with a gradient shade above it for text. Colors go one per index
  (`$control__colors.0="#04161A"` …; up to 8 on liquid-gradient, 4 on wave-gradient); a color token is accepted there.
- **Color:** the palette's base and ink tones and one second hue, never the action accent: the accent then floods
  the background and the buttons lose their contrast.
- **Image shaders** (fluted-glass and others) take `$control__texture.src` and `$control__texture.alt` (any https
  image; Framer re-uploads it).
- **`shader` cannot change** through `SET`: delete the node and add a new one. Its controls can change. Screenshots
  render shaders.
- **A shader that moves** for more than 5 s needs a pause ([motion.md](motion.md), other effects).

## Icons

- **Find the set:** `framer.agent.listIconSets()` gives the set ids (project, external and insertable sets).
- **Find the name:** `framer.agent.readIcons({ iconSetId })` gives the exact names. Copy them exactly: some contain
  double spaces ("Prism  Gradient").
- **Find the controls:** `framer.agent.readIconSetControls({ iconSetIds })`.
- **Place:** `+IconNode i1 parent="…" set="<set id>" $control__icon="<exact name>";` plus the set's own controls
  (`$control__color`, Lucide's `$control__width`).
- **Phosphor icons are outlines until `$control__alpha="1"`:** a filled star for a rating needs it.
- **One icon set per site,** and check its arrows on the published site: some sets draw them differently on the web
  than on the canvas (Phosphor's "Arrow Right" as "–▷"). Lucide gives clean arrows.
- **A new item in a project vector set** that the session cannot see ("does not exist in set") needs a new session
  (see [verify.md](verify.md)).

## Logos and own vectors

- **Logos and marks are vectors, not raster images.** The best home is an item of a project vector set (Vectors panel
  → Project).
  - The API reads vector sets but cannot add to them. Ask the user to add the SVG there.
  - Then place it as an `IconNode` of that set, in a wrapper with `width="1fr"` and `aspectRatio`. For full width, pin
    the wrapper `left`, `right`, `top` 0 and give it `aspectRatio`.
  - A fixed-size IconNode in a wrapper without stack layout can render at another size on the site than on the
    canvas: size it through a stack wrapper with `aspectRatio`.
  - A set item's canvas is 40×40 until the user crops it to the logo.
- **`framer.addSVG` failed through the Server API** with "Failed to optimize SVG", with and without width and height.
  Fallbacks:
  - upload the SVG as an image and use it as a `fill`:
    `framer.uploadImage({ image: "data:image/svg+xml;base64,…", name: "logo.svg" })`;
  - to color it with a token, use the upload as `masks.0.mask` over a token fill.
- **The DSL has no SVG node.** A `PathNode` (from `addSVG` through a plugin) has no SVG canvas around it, which shifts
  its center, and it takes no `left` / `top`. Wrap it in a frame the size of the icon's canvas and position it through
  the parent stack.

## Favicon and site metadata

- **Site-wide:** `SET rootNode metadata.title="…" metadata.description="…" metadata.favicon="<uploaded url>";` on the
  `RootNode`.
- **Per page:** overrides go in the page's own metadata.
- **Hiding a page from search:** `metadata.noIndex="true"` on the `WebPageNode` also turns on `metadata.noIndexSite`
  (out of the site's own search), and `noIndex="false"` leaves it on: write both. `RootNode` refuses
  `metadata.noIndex`, so hide pages one by one. `metadata.description=""` on a page removes its own, and the page
  inherits the site's again.
- **Builds:** for a full site build, set the site metadata when the project has none.
- **The full set:** `metadata.favicon` (the mark as SVG) and `metadata.faviconDark`, `metadata.appleTouchIcon` (a
  180×180 PNG of the mark on the base color) and `metadata.socialImage` (1200×630, a screenshot of the hero). Redo all
  of them after a rebrand: old colors in the tab icon give it away.
