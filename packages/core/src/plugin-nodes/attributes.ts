import {
  BORDER_STYLES,
  DSL_TYPE_OF_PLUGIN_CLASS,
  FLOW_LAYOUTS,
  PIN_ATTRIBUTES,
  PLUGIN_ATTRIBUTE_RULES,
  PLUGIN_DEFAULT_VALUES,
  TOKEN_VALUE,
} from "../constants/plugin-nodes.ts";
import type { ColorStyleHandle, TextStyleHandle } from "../types/framer-port.ts";
import type {
  AttributeRule,
  PendingGradient,
  PendingImage,
  PluginAttributes,
  PluginNodeRecord,
  StyleLookup,
} from "../types/plugin-nodes.ts";
import { parseLinearGradient } from "../utils/gradient.ts";

/** Attributes the XML writer reads itself rather than setting them. */
const STRUCTURE = new Set(["text"]);

/**
 * A node's DSL attributes as Plugin API attributes, for `type` (a DSL type; `RichTextNode` takes its `text` apart).
 * Tokens and text styles become the project's objects. An attribute only the DSL has is `unsupported`; a value the
 * Plugin API cannot take is `invalid`. "null" clears an attribute.
 */
export function toPluginAttributes(
  type: string,
  attributes: Readonly<Record<string, string>>,
  styles: StyleLookup,
): PluginAttributes {
  const converted: Record<string, unknown> = {};
  const unsupported: string[] = [];
  const invalid: string[] = [];
  let text: string | null = null;

  for (const [name, value] of Object.entries(attributes)) {
    if (STRUCTURE.has(name) && type === "RichTextNode") {
      text = value;
      continue;
    }

    const rule = PLUGIN_ATTRIBUTE_RULES.find((candidate) => candidate.dsl === name);

    if (rule === undefined || (rule.only !== undefined && !rule.only.includes(type))) {
      unsupported.push(name);
      continue;
    }

    const result = toPluginValue(rule, value, styles);

    if (result.ok) {
      converted[rule.plugin] = result.value;
    } else {
      invalid.push(`${name}="${value}": ${result.reason}`);
    }
  }

  return {
    attributes: converted,
    text,
    unsupported,
    invalid,
  };
}

/**
 * A node the Plugin API read, as the DSL would print it: its DSL type and attributes as strings, without unset values
 * and defaults. A child of a stack or grid flows: the Plugin API reports it as absolute at 0,0, the DSL as relative,
 * so it gets `position="relative"` and no pins.
 */
export function fromPluginNode(
  node: PluginNodeRecord,
  parentLayout: string | null,
): { type: string; attributes: Record<string, string> } {
  const className = typeof node.__class === "string" ? node.__class : "Node";
  const type = DSL_TYPE_OF_PLUGIN_CLASS[className] ?? className;
  const flows = parentLayout !== null && FLOW_LAYOUTS.has(parentLayout);
  const attributes: Record<string, string> = {};

  for (const rule of PLUGIN_ATTRIBUTE_RULES) {
    if ((rule.only !== undefined && !rule.only.includes(type)) || !(rule.plugin in node) || rule.dsl === "name") {
      continue;
    }

    const value = fromPluginValue(rule, node[rule.plugin]);

    if (value === null || PLUGIN_DEFAULT_VALUES[rule.dsl] === value || (flows && PIN_ATTRIBUTES.has(rule.dsl))) {
      continue;
    }

    attributes[rule.dsl] = value;
  }

  if (flows && "position" in attributes) {
    attributes.position = "relative";
  }

  // An image fill reads as the DSL writes it: fill="<url>"; a gradient as its CSS.
  const image = node["backgroundImage"];
  const gradient = node["backgroundGradient"];

  if (typeof image === "object" && image !== null && "url" in image && typeof image.url === "string") {
    attributes.fill = image.url;
  }

  if (
    typeof gradient === "object" &&
    gradient !== null &&
    "toCSS" in gradient &&
    typeof gradient.toCSS === "function"
  ) {
    attributes.fill = String(gradient.toCSS());
  }

  return {
    type,
    attributes,
  };
}

type Converted = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly reason: string };

function toPluginValue(rule: AttributeRule, value: string, styles: StyleLookup): Converted {
  if (value === "null") {
    return ok(null);
  }

  switch (rule.kind) {
    case "text":
      return ok(value);
    case "boolean":
      return value === "true" || value === "false" ? ok(value === "true") : fail("true or false");
    case "number":
      return Number.isFinite(Number(value)) ? ok(Number(value)) : fail("a number");
    case "degrees": {
      const degrees = Number(value.replace(/deg$/, ""));

      return Number.isFinite(degrees) ? ok(degrees) : fail('degrees, e.g. "15deg"');
    }
    case "size":
      return ok(value === "auto" ? "fit-content" : value);
    case "px":
      return ok(/^-?\d+(\.\d+)?$/.test(value) ? `${value}px` : value);
    case "pxNumber": {
      const pixels = Number(value.replace(/px$/, ""));

      return Number.isFinite(pixels) ? ok(pixels) : fail('pixels, e.g. "240px"');
    }
    case "countOrKeyword":
      return ok(Number.isFinite(Number(value)) ? Number(value) : value);
    case "color":
      return colorValue(value, styles.colors);
    case "border":
      return borderValue(value, styles.colors);
    case "textStyle":
      return textStyleValue(value, styles.texts);
  }
}

function fromPluginValue(rule: AttributeRule, value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  switch (rule.kind) {
    case "degrees":
      return `${String(value)}deg`;
    case "size":
      return value === "fit-content" ? "auto" : String(value);
    case "pxNumber":
      return `${String(value)}px`;
    case "color":
      return colorText(value);
    case "border":
      return borderText(value);
    case "textStyle":
      return textStyleText(value);
    default:
      return typeof value === "object" ? null : String(value);
  }
}

/**
 * A color as written, a token as the project's ColorStyle, an image URL to upload when the batch runs (it becomes the
 * frame's backgroundImage), or a linear gradient to build from Framer's gradient class (its token stops as
 * ColorStyles). Radial and conic gradients need the DSL.
 */
function colorValue(value: string, colors: readonly ColorStyleHandle[]): Converted {
  const token = TOKEN_VALUE.exec(value)?.[1];

  if (token !== undefined) {
    const style = colors.find((color) => color.id === token);

    return style === undefined ? fail(`no color token with id ${token}`) : ok(style);
  }

  if (/^https?:\/\//.test(value)) {
    const image: PendingImage = { imageUrl: value };

    return ok(image);
  }

  if (/^linear-gradient/.test(value)) {
    return gradientValue(value, colors);
  }

  if (/^(radial-gradient|conic-gradient)/.test(value)) {
    return fail("radial and conic gradients need a Server API key (the DSL)");
  }

  return ok(value);
}

function gradientValue(value: string, colors: readonly ColorStyleHandle[]): Converted {
  const spec = parseLinearGradient(value);

  if (spec === null) {
    return fail(
      'linear-gradient(<angle>deg, <color> <position>%, …), e.g. "linear-gradient(180deg, #000 0%, #fff 100%)"',
    );
  }

  const stops = [];

  for (const stop of spec.stops) {
    const token = typeof stop.color === "string" ? TOKEN_VALUE.exec(stop.color)?.[1] : undefined;
    const style = token === undefined ? undefined : colors.find((color) => color.id === token);

    if (token !== undefined && style === undefined) {
      return fail(`no color token with id ${token}`);
    }

    stops.push({
      color: style ?? stop.color,
      position: stop.position,
    });
  }

  const pending: PendingGradient = {
    gradient: {
      ...spec,
      stops,
    },
  };

  return ok(pending);
}

/** "1px solid #000000", the color possibly a token or rgba() with spaces. */
function borderValue(value: string, colors: readonly ColorStyleHandle[]): Converted {
  const match = /^(\S+)\s+(\S+)\s+(.+)$/.exec(value.trim());
  const [, width = "", style = "", color = ""] = match ?? [];

  if (match === null || !BORDER_STYLES.has(style)) {
    return fail('"<width> <solid|dashed|dotted|double> <color>", e.g. "1px solid #000000"');
  }

  const converted = colorValue(color, colors);

  return converted.ok
    ? ok({
        width: /^\d+(\.\d+)?$/.test(width) ? `${width}px` : width,
        style,
        color: converted.value,
      })
    : converted;
}

/** A text style by id, by its full path ("Headings/H1" or "/Headings/H1"), or by a name only one style has. */
function textStyleValue(value: string, texts: readonly TextStyleHandle[]): Converted {
  const path = value.startsWith("/") ? value : `/${value}`;
  const byPath = texts.find((style) => style.id === value || style.path === path);
  const byName = texts.filter((style) => style.name === value);
  const style = byPath ?? (byName.length === 1 ? byName[0] : undefined);

  return style === undefined ? fail(`no single text style named "${value}"`) : ok(style);
}

function colorText(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  const id = idOf(value);

  return id === null ? null : `var(--token-${id})`;
}

function borderText(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const { width, style, color } = value as { width?: unknown; style?: unknown; color?: unknown };
  const colorPart = colorText(color);

  return typeof width === "string" && typeof style === "string" && colorPart !== null
    ? `${width} ${style} ${colorPart}`
    : null;
}

/** The DSL names a text style by its path without the leading slash. */
function textStyleText(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const { path, name } = value as { path?: unknown; name?: unknown };

  if (typeof path === "string") {
    return path.replace(/^\//, "");
  }

  return typeof name === "string" ? name : null;
}

function idOf(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("id" in value)) {
    return null;
  }

  return typeof value.id === "string" ? value.id : null;
}

function ok(value: unknown): Converted {
  return {
    ok: true,
    value,
  };
}

function fail(expected: string): Converted {
  return {
    ok: false,
    reason: expected.startsWith("no ") || expected.includes("need") ? expected : `expected ${expected}`,
  };
}
