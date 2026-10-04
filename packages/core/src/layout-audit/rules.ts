import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_STACK_GAP,
  DIVIDER_MAX_PX,
  FIXED_WIDTH_LIMIT_PX,
  HEADING_TAGS,
  PILL_RADIUS_PX,
  RAW_COLOR,
  SECTION_RHYTHM_MAX,
  SEQUENCE_NUMBER,
  SPACED_DISTRIBUTIONS,
  TEMPLATE_REPEAT,
} from "../constants/layout-audit.ts";
import type { SerializedNode } from "../types/dsl.ts";
import type { AuditContext, AuditIssue, NodeRule, PageRule } from "../types/layout-audit.ts";
import {
  attr,
  childrenOf,
  crossAlignmentOf,
  directionOf,
  hasSurface,
  inFlow,
  isFrame,
  issue,
  isText,
  label,
  layoutOf,
  paddingOf,
  px,
  sizeKind,
  textAnchorOf,
  textContent,
  walk,
} from "./tree.ts";

/**
 * Children of a vertical stack must share one left edge, one center or one right edge. The stack places fit-width
 * children by its stackAlignment (center by default), while fill-width text places its lines by its own alignment: mix
 * them and a label sits centered over a left-aligned paragraph.
 */
const mixedAlignment: NodeRule = (node, context) => {
  if (layoutOf(node) !== "stack" || directionOf(node) !== "vertical") {
    return [];
  }

  const anchors = new Map<string, string[]>();

  for (const child of childrenOf(node).filter(inFlow)) {
    const width = sizeKind(attr(child, "width"));
    const where =
      width === "fill"
        ? isText(child)
          ? textAnchorOf(child, context)
          : null
        : crossAlignmentOf(node).replace("flex-", "");

    if (where !== null) {
      anchors.set(where, [...(anchors.get(where) ?? []), child.name ?? child.type]);
    }
  }

  if (anchors.size < 2) {
    return [];
  }

  const where = [...anchors].map(([edge, names]) => `${names.join(", ")} at the ${edge}`).join("; ");

  return [
    issue(
      "mixed-alignment",
      "defect",
      node,
      `Children of ${label(node)} line up on different edges: ${where}. A stack places fit-width children by its stackAlignment (center by default), fill-width text by its own alignment.`,
      `Pick one edge for the column: stackAlignment="start" on ${label(node)} with left-aligned text styles, or centered text styles with stackAlignment="center".`,
    ),
  ];
};

/**
 * Cells of a multi-column grid keep their own height and sit centered in their row unless they fill it, so cards end
 * up with ragged tops and bottoms.
 */
const unevenGridCells: NodeRule = (node) => {
  if (layoutOf(node) !== "grid") {
    return [];
  }

  const columns = attr(node, "gridColumnCount");

  if (columns === "1") {
    return [];
  }

  const cells = childrenOf(node).filter((child) => inFlow(child) && isFrame(child));
  const loose = cells.filter((cell) => attr(cell, "height") !== "1fr");
  const fixed = new Set(cells.map((cell) => attr(cell, "height")));

  if (cells.length < 2 || loose.length === 0 || (fixed.size === 1 && sizeKind([...fixed][0] ?? null) === "fixed")) {
    return [];
  }

  return [
    issue(
      "uneven-grid-cells",
      "defect",
      node,
      `${loose.length} of ${cells.length} cells of ${label(node)} keep their own height and sit centered in their row, so their tops and bottoms do not line up.`,
      `Give every cell height="1fr" and ${label(node)} gridRowHeightType="auto": each row takes its tallest cell's height and every cell fills it. Inside the cells, stackAlignment="start" keeps the content at the top.`,
    ),
  ];
};

/** Cards side by side in a row stretch to one height only when they fill it. */
const unevenRowCards: NodeRule = (node) => {
  if (layoutOf(node) !== "stack" || directionOf(node) !== "horizontal") {
    return [];
  }

  const cards = childrenOf(node).filter(
    (child) => inFlow(child) && isFrame(child) && hasSurface(child) && attr(child, "link") === null,
  );
  const loose = cards.filter((card) => attr(card, "height") !== "1fr");

  if (cards.length < 2 || loose.length === 0) {
    return [];
  }

  return [
    issue(
      "uneven-row-cards",
      "likely",
      node,
      `${cards.length} cards in ${label(node)} take their own heights, so they end at different lines.`,
      `Give each card height="1fr" (the row keeps height="auto"): they stretch to the tallest one.`,
    ),
  ];
};

/** A link on a text node gets Framer's link style (blue by default), over the text style's color. */
const textLink: NodeRule = (node) =>
  isText(node) && attr(node, "link") !== null
    ? [
        issue(
          "text-link",
          "defect",
          node,
          `${label(node)} is a text link: Framer draws text links in the project's link style (blue by default), not in the text style's color.`,
          "Put the link on a frame around the text (a nav item or button frame with layout stack), or give the project link styles that match the design.",
        ),
      ]
    : [];

const unstyledText: NodeRule = (node) =>
  isText(node) && attr(node, "textStylePreset") === null
    ? [
        issue(
          "unstyled-text",
          "likely",
          node,
          `${label(node)} has no text style, so it keeps Framer's default type and drifts from the design system.`,
          "Give it one of the project's text styles (textStylePreset).",
        ),
      ]
    : [];

const rawColor: NodeRule = (node, context) => {
  if (!context.hasTokens) {
    return [];
  }

  const raw = ["fill", "textColor", "border"].filter((name) => RAW_COLOR.test(attr(node, name) ?? ""));

  return raw.length === 0
    ? []
    : [
        issue(
          "raw-color",
          "taste",
          node,
          `${label(node)} sets ${raw.join(", ")} with a written-out color while the project has tokens.`,
          "Use the matching token, var(--token-<id>), so a palette change reaches it.",
        ),
      ];
};

/** Fixed px widths on content do not shrink with the window. Breakpoint frames and media are exempt. */
const fixedWidthContent: NodeRule = (node) => {
  const width = px(attr(node, "width"));

  if (
    width === null ||
    width <= FIXED_WIDTH_LIMIT_PX ||
    !inFlow(node) ||
    attr(node, "aspectRatio") !== null ||
    attr(node, "backgroundImage") !== null ||
    !(isFrame(node) || isText(node))
  ) {
    return [];
  }

  return [
    issue(
      "fixed-width",
      "likely",
      node,
      `${label(node)} is ${width}px wide, so it overflows narrower screens.`,
      `Use width="1fr" with maxWidth="${width}px".`,
    ),
  ];
};

const fixedHeightContainer: NodeRule = (node) => {
  const height = attr(node, "height");

  if (
    !isFrame(node) ||
    sizeKind(height) !== "fixed" ||
    attr(node, "aspectRatio") !== null ||
    !walk(node).slice(1).some(isText)
  ) {
    return [];
  }

  return [
    issue(
      "fixed-height",
      "likely",
      node,
      `${label(node)} has a fixed height of ${height} with text inside: when the text wraps on a narrower screen it overflows or clips.`,
      `Use height="auto", with minHeight="${height}" if it needs a floor.`,
    ),
  ];
};

const gapWithSpacedDistribution: NodeRule = (node) => {
  const distribution = attr(node, "stackDistribution");
  const gap = px(attr(node, "gap"));

  return distribution !== null &&
    SPACED_DISTRIBUTIONS.has(distribution) &&
    gap !== null &&
    gap > 0 &&
    attr(node, "gap") !== DEFAULT_STACK_GAP
    ? [
        issue(
          "gap-with-space-between",
          "likely",
          node,
          `${label(node)} has gap="${attr(node, "gap")}" with stackDistribution="${distribution}": the distribution decides the spacing and the gap is ignored.`,
          "Keep one of the two: the gap with stackDistribution start or center, or the distribution without a gap.",
        ),
      ]
    : [];
};

/** A nested surface's corners look right when they are smaller than the outer ones by about the padding. */
const nestedRadius: NodeRule = (node) => {
  const outer = px(attr(node, "radius"));
  const padding = Math.min(...paddingOf(node));

  if (outer === null || outer === 0 || padding === 0) {
    return [];
  }

  const target = Math.max(outer - padding, 0);

  return childrenOf(node)
    .filter((child) => isFrame(child) && hasSurface(child))
    .flatMap((child) => {
      const inner = px(attr(child, "radius"));

      return inner !== null && inner < PILL_RADIUS_PX && inner > target && inner >= outer
        ? [
            issue(
              "nested-radius",
              "taste",
              child,
              `${label(child)} has radius ${inner}px inside ${label(node)} with radius ${outer}px and ${padding}px padding: the corners are not concentric.`,
              `Use radius="${Math.max(target, 4)}px" on ${label(child)} (outer radius minus padding).`,
            ),
          ]
        : [];
    });
};

export const NODE_RULES: readonly NodeRule[] = [
  mixedAlignment,
  unevenGridCells,
  unevenRowCards,
  textLink,
  unstyledText,
  rawColor,
  fixedWidthContent,
  fixedHeightContainer,
  gapWithSpacedDistribution,
  nestedRadius,
];

/** The page's sections: what sits in the flow of the breakpoint frame, dividers aside. */
function sectionsOf(breakpoint: SerializedNode): SerializedNode[] {
  return childrenOf(breakpoint).filter(
    (child) =>
      inFlow(child) &&
      !(childrenOf(child).length === 0 && (px(attr(child, "height")) ?? Number.POSITIVE_INFINITY) <= DIVIDER_MAX_PX),
  );
}

/** The width a section keeps its content within: its own maxWidth, else that of a filling frame two levels down. */
function contentWidthOf(section: SerializedNode): number | null {
  const own = px(attr(section, "maxWidth"));

  if (own !== null) {
    return own;
  }

  const inner = [...childrenOf(section), ...childrenOf(section).flatMap(childrenOf)]
    .filter((child) => isFrame(child) && sizeKind(attr(child, "width")) === "fill")
    .map((child) => px(attr(child, "maxWidth")))
    .filter((width) => width !== null);

  return inner.length === 0 ? null : Math.max(...inner);
}

/** Header, sections and footer keep their content within one container width. */
const containerWidths: PageRule = (breakpoint) => {
  const sections = sectionsOf(breakpoint).filter((section) => sizeKind(attr(section, "width")) === "fill");
  const widths = sections.map((section) => ({
    section,
    width: contentWidthOf(section),
  }));
  const bounded = widths.flatMap(({ width }) => (width === null ? [] : [width]));

  if (bounded.length === 0) {
    return [];
  }

  const container = Math.max(...bounded);

  return widths
    .filter(({ width }) => width === null)
    .map(({ section }) =>
      issue(
        "container-width",
        "defect",
        section,
        `${label(section)} spreads its content over the full window while the other sections keep it within ${container}px, so its edges do not line up with theirs.`,
        `Keep ${label(section)} full width for its background and put its content into a Container frame inside (width="1fr", maxWidth="${container}px").`,
      ),
    );
};

/** One rhythm of section spacing reads as designed; many different paddings read as accidental. */
const sectionRhythm: PageRule = (breakpoint) => {
  const sections = sectionsOf(breakpoint);
  const paddings = new Set(
    sections
      .slice(1, -1)
      .map((section) => paddingOf(section)[0])
      .filter((top) => top > 0),
  );

  return paddings.size > SECTION_RHYTHM_MAX
    ? [
        issue(
          "section-rhythm",
          "taste",
          breakpoint,
          `Sections of ${label(breakpoint)} start with ${[...paddings].map((value) => `${value}px`).join(", ")} of padding: the spacing has no rhythm.`,
          "Use one vertical section padding (two at most, for a tighter band), e.g. 128px on desktop.",
        ),
      ]
    : [];
};

const headings: PageRule = (breakpoint, context) => {
  const tags = walk(breakpoint)
    .filter(isText)
    .map((node) => ({
      node,
      tag: context.textStyle(node.attributes?.["textStylePreset"])?.tag ?? "p",
    }));
  const h1 = tags.filter(({ tag }) => tag === "h1");
  const levels = tags.flatMap(({ node, tag }) => {
    const level = (HEADING_TAGS as readonly string[]).indexOf(tag);

    return level === -1
      ? []
      : [
          {
            node,
            level,
          },
        ];
  });
  const issues: AuditIssue[] = [];

  if (h1.length !== 1) {
    issues.push(
      issue(
        "h1-count",
        "likely",
        breakpoint,
        `${label(breakpoint)} has ${h1.length} h1 headings; a page needs exactly one.`,
        h1.length === 0
          ? "Give the main headline a text style with tag h1."
          : "Keep h1 on the main headline and give the others h2.",
      ),
    );
  }

  levels.forEach(({ node, level }, index) => {
    const previous = levels[index - 1]?.level;

    if (level > (previous ?? 0) + 1) {
      issues.push(
        issue(
          "heading-skip",
          "taste",
          node,
          previous === undefined
            ? `${label(node)} is an h${level + 1} but the first heading on the page: a level is skipped.`
            : `${label(node)} is an h${level + 1} after an h${previous + 1}: a heading level is skipped.`,
          previous === undefined
            ? "Give a logo or label a paragraph style, and start the headings with the h1."
            : `Use h${previous + 2} here, or restyle without changing the level.`,
        ),
      );
    }
  });

  return issues;
};

/** Uppercase labels over headings and numbered cards are the template's habits, not the content's. */
const templateHabits: PageRule = (breakpoint, context) => {
  const nodes = walk(breakpoint);
  const eyebrows = nodes.filter((node) => {
    const siblings = childrenOf(node);

    return siblings.some((child, index) => {
      const next = siblings[index + 1];
      const style = context.textStyle(child.attributes?.["textStylePreset"]);
      const nextTag = next === undefined ? null : context.textStyle(next.attributes?.["textStylePreset"])?.tag;

      return isText(child) && style?.transform === "uppercase" && /^h[1-3]$/.test(nextTag ?? "");
    });
  });
  const numbered = nodes.flatMap((parent) => {
    const numbers = childrenOf(parent).flatMap((card) => {
      const first = childrenOf(card).find(isText);
      const text = first === undefined ? null : textContent(first);

      return isFrame(card) && text !== null && SEQUENCE_NUMBER.test(text) ? [Number.parseInt(text, 10)] : [];
    });

    return numbers.length >= TEMPLATE_REPEAT && numbers.every((value, index) => value === (numbers[0] ?? 0) + index)
      ? numbers
      : [];
  });
  const issues: AuditIssue[] = [];

  if (eyebrows.length >= TEMPLATE_REPEAT) {
    issues.push(
      issue(
        "eyebrow-labels",
        "taste",
        breakpoint,
        `${eyebrows.length} headings on ${label(breakpoint)} carry an uppercase label above them: a template habit that makes every section look the same.`,
        "Keep a label only where it names a real category; let the other headings stand alone.",
      ),
    );
  }

  if (numbered.length >= TEMPLATE_REPEAT) {
    issues.push(
      issue(
        "numbered-cards",
        "taste",
        breakpoint,
        `${numbered.length} cards start with a number (01, 02…): numbering reads as a template unless the items are real steps.`,
        "Drop the numbers, or keep them only for an actual sequence (how it works, a process).",
      ),
    );
  }

  return issues;
};

/** A landing page without a single image reads unfinished, not minimal. */
const noImagery: PageRule = (breakpoint) => {
  const nodes = walk(breakpoint);
  const images = nodes.filter(
    (node) =>
      attr(node, "backgroundImage") !== null ||
      /url\(|image/i.test(attr(node, "fill") ?? "") ||
      node.type === "ImageNode" ||
      node.type === "ShaderNode",
  );
  const vectors = nodes.filter((node) => node.type === "SVGNode");

  return images.length === 0 && vectors.length <= 1
    ? [
        issue(
          "no-imagery",
          "taste",
          breakpoint,
          `${label(breakpoint)} has no images: a text-only landing page reads unfinished.`,
          "Add a hero visual and two or three supporting images (image_upload, then an image fill on a frame with an aspectRatio), or tell the user which images are needed and where.",
        ),
      ]
    : [];
};

export const PAGE_RULES: readonly PageRule[] = [containerWidths, sectionRhythm, headings, templateHabits, noImagery];

/** Checks on the project's text styles as a whole. */
export function projectIssues(page: SerializedNode, context: AuditContext): AuditIssue[] {
  const families = new Set(context.textStyles.map((style) => style.family));
  const issues: AuditIssue[] = [];

  if (context.textStyles.length > 0 && families.size === 1 && families.has(DEFAULT_FONT_FAMILY)) {
    issues.push(
      issue(
        "default-font",
        "taste",
        page,
        `Every text style uses ${DEFAULT_FONT_FAMILY}, the automatic choice of generated pages.`,
        "Choose a family for the brief with fonts_search (a characterful sans or a serif for headings) and keep Inter only if the brief calls for it.",
      ),
    );
  }

  const unbalanced = context.textStyles.filter((style) => /^h[1-3]$/.test(style.tag) && !style.balance);

  if (unbalanced.length > 0) {
    issues.push(
      issue(
        "heading-balance",
        "taste",
        page,
        `${unbalanced.length} heading styles wrap without balance, so a headline can leave one word alone on its last line.`,
        "Turn on balance for the heading text styles (text_styles_upsert balance: true).",
      ),
    );
  }

  return issues;
}
