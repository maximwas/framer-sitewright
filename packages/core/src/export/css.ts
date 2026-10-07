import type { ExportContext, ExportTextStyle, StackDirection } from "./types.ts";

const DISTRIBUTION: Readonly<Record<string, string>> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  "space-between": "space-between",
  "space-around": "space-around",
  "space-evenly": "space-evenly",
};

const ALIGNMENT: Readonly<Record<string, string>> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

const PASS_THROUGH: readonly (readonly [string, string])[] = [
  ["padding", "padding"],
  ["radius", "border-radius"],
  ["border", "border"],
  ["minWidth", "min-width"],
  ["maxWidth", "max-width"],
  ["minHeight", "min-height"],
  ["maxHeight", "max-height"],
  ["aspectRatio", "aspect-ratio"],
  ["position", "position"],
  ["top", "top"],
  ["right", "right"],
  ["bottom", "bottom"],
  ["left", "left"],
  ["zIndex", "z-index"],
  ["opacity", "opacity"],
  ["overflow", "overflow"],
  ["textColor", "color"],
];

/** A fill as CSS: a token or color as the background, a gradient or an image URL as its image. */
function fillDeclarations(fill: string): [string, string][] {
  if (fill.includes("gradient(")) {
    return [["background-image", fill]];
  }

  if (/^https?:\/\//.test(fill)) {
    return [
      ["background-image", `url("${fill}")`],
      ["background-size", "cover"],
      ["background-position", "center"],
    ];
  }

  return [["background", fill]];
}

/**
 * A width or height: px and % as they are, auto fits the content. 1fr along the parent stack's direction shares its
 * free space (flex); across it, or outside a stack, it fills the parent.
 */
function sizeDeclarations(
  property: "width" | "height",
  value: string,
  parentDirection: StackDirection,
): [string, string][] {
  if (value.endsWith("fr")) {
    const along =
      (property === "width" && parentDirection === "row") || (property === "height" && parentDirection === "column");

    return along ? [["flex", `${Number.parseFloat(value)} 1 0`]] : [[property, "100%"]];
  }

  return value === "auto" ? [] : [[property, value]];
}

function textStyleDeclarations(style: ExportTextStyle): [string, string][] {
  return [
    ["font-family", `"${style.font.family}"`],
    ["font-weight", String(style.font.weight ?? 400)],
    ...(style.font.style === "italic" ? ([["font-style", "italic"]] as [string, string][]) : []),
    ["font-size", style.fontSize],
    ["line-height", style.lineHeight],
    ["letter-spacing", style.letterSpacing],
    ...(style.transform === "none" ? [] : ([["text-transform", style.transform]] as [string, string][])),
    ["text-align", style.alignment],
    ...(style.decoration === "none" ? [] : ([["text-decoration", style.decoration]] as [string, string][])),
    ...(style.balance ? ([["text-wrap", "balance"]] as [string, string][]) : []),
  ];
}

/** A layer's DSL attributes as CSS declarations, in a stable order. */
export function cssDeclarations(
  attributes: Readonly<Record<string, unknown>>,
  parentDirection: StackDirection,
  context: ExportContext,
): [string, string][] {
  const value = (key: string) => (typeof attributes[key] === "string" ? (attributes[key] as string) : null);
  const declarations: [string, string][] = [];
  const layout = value("layout");

  if (attributes["visible"] === false || value("visible") === "false") {
    declarations.push(["display", "none"]);
  } else if (layout === "stack") {
    declarations.push(
      ["display", "flex"],
      ["flex-direction", value("stackDirection") === "horizontal" ? "row" : "column"],
    );

    const distribution = DISTRIBUTION[value("stackDistribution") ?? ""];
    const alignment = ALIGNMENT[value("stackAlignment") ?? ""];

    if (distribution !== undefined) {
      declarations.push(["justify-content", distribution]);
    }

    if (alignment !== undefined) {
      declarations.push(["align-items", alignment]);
    }

    if (value("stackWrapEnabled") === "true" || attributes["stackWrapEnabled"] === true) {
      declarations.push(["flex-wrap", "wrap"]);
    }
  } else if (layout === "grid") {
    const columns = value("gridColumnCount");
    const minimum = value("gridColumnMinWidth") ?? "200px";

    declarations.push(
      ["display", "grid"],
      [
        "grid-template-columns",
        columns === "auto-fill" || columns === null
          ? `repeat(auto-fill, minmax(${minimum}, 1fr))`
          : `repeat(${columns}, minmax(0, 1fr))`,
      ],
    );
  }

  const gap = value("gap");

  if (gap !== null && layout !== null) {
    declarations.push(["gap", gap]);
  }

  for (const [key, property] of PASS_THROUGH.slice(0, 1)) {
    const found = value(key);

    if (found !== null) {
      declarations.push([property, found]);
    }
  }

  const fill = value("fill");

  if (fill !== null) {
    declarations.push(...fillDeclarations(fill));
  }

  for (const [key, property] of PASS_THROUGH.slice(1)) {
    const found = value(key) ?? (typeof attributes[key] === "number" ? String(attributes[key]) : null);

    if (found !== null) {
      declarations.push([property, found]);
    }
  }

  for (const property of ["width", "height"] as const) {
    const found = value(property);

    if (found !== null) {
      declarations.push(...sizeDeclarations(property, found, parentDirection));
    }
  }

  const preset = value("textStylePreset");
  const style = preset === null ? undefined : context.textStyles.get(preset);

  if (style !== undefined) {
    declarations.push(...textStyleDeclarations(style));
  }

  return declarations;
}

/** The tokens as CSS variables, with the dark values under prefers-color-scheme. */
export function tokenVariables(context: ExportContext): string {
  const tokens = [...context.tokens];
  const light = tokens.map(([id, { light: color }]) => `  --token-${id}: ${color};`);
  const dark = tokens.flatMap(([id, { dark: color }]) => (color === null ? [] : [`    --token-${id}: ${color};`]));

  return [
    `:root {\n${light.join("\n")}\n}`,
    ...(dark.length === 0 ? [] : [`@media (prefers-color-scheme: dark) {\n  :root {\n${dark.join("\n")}\n  }\n}`]),
  ].join("\n\n");
}
