import {
  AUTO_TEXT_CHARS,
  BODY_SIZE_MAX_PX,
  BODY_SIZE_MIN_PX,
  CENTERED_MIN_HEADINGS,
  CENTERED_SHARE_MAX,
  DEFAULT_STACK_GAP,
  DISPLAY_LINE_HEIGHT_MAX,
  DISPLAY_SIZE_PX,
  DIVIDER_MAX_PX,
  FIXED_WIDTH_LIMIT_PX,
  HEADING_TAGS,
  HIERARCHY_RATIO_MIN,
  PHONE_GRID_MAX_COLUMNS,
  PHONE_HEADING_MAX_PX,
  PHONE_MAX_WIDTH_PX,
  PHONE_SIDE_PADDING_MAX_PX,
  PILL_RADIUS_PX,
  RAW_COLOR,
  ROW_COLUMN_MIN_PX,
  SECTION_RHYTHM_MAX,
  SEQUENCE_NUMBER,
  SPACED_DISTRIBUTIONS,
  TABLET_GRID_MAX_COLUMNS,
  TABLET_MAX_WIDTH_PX,
  TEMPLATE_REPEAT,
  VIEWPORT_POSITIONS,
} from "../constants/layout-audit.ts";
import type { SerializedNode } from "../types/dsl.ts";
import type { AuditContext, AuditIssue, AuditTextStyle, NodeRule, PageRule } from "../types/layout-audit.ts";
import {
  attr,
  childrenOf,
  crossAlignmentOf,
  directionOf,
  hasEffect,
  hasOwnContent,
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

  // A card holds content: a filled frame without children is a photo or a swatch, as in a line of words with photos.
  const cards = childrenOf(node).filter(
    (child) =>
      inFlow(child) &&
      isFrame(child) &&
      hasSurface(child) &&
      attr(child, "link") === null &&
      childrenOf(child).length > 0,
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
  isText(node) && attr(node, "link") !== null && attr(node, "linkStylePreset") === null
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

/**
 * A parent that hugs its content with a child that fills it: neither has a size, and Framer silently fixes one. Along
 * a stack's direction any filling child does it. Across it, children that fill a hugging row stretch to the tallest
 * one's content (how cards get equal heights): only children with nothing inside leave the parent without a size. A
 * component instance has its component's layers inside, though a read shows none.
 */
const fitParentFillChild: NodeRule = (node) =>
  (["width", "height"] as const).flatMap((axis) => {
    const along = alongAxis(node, axis);

    if (along === null || sizeKind(attr(node, axis)) !== "fit") {
      return [];
    }

    const flow = childrenOf(node).filter(inFlow);
    // Along the stack, an empty spacer next to content takes what is left and nothing when nothing is: Framer keeps the
    // parent hugging (a card's spacer that pins its last item to the bottom).
    const sized = flow.some((child) => hasOwnContent(child) && !attr(child, axis)?.endsWith("fr"));
    const spacer = (child: SerializedNode) => along && sized && !hasOwnContent(child) && !hasSurface(child);
    const filling = flow.filter(
      (child) => attr(child, axis)?.endsWith("fr") && !(axis === "width" && isText(child)) && !spacer(child),
    );
    const conflict = along
      ? filling.length > 0
      : filling.length === flow.length && filling.every((child) => !hasOwnContent(child));

    return filling.length === 0 || !conflict
      ? []
      : [
          issue(
            "fit-parent-fill-child",
            "defect",
            node,
            `${label(node)} hugs its content (${axis}="${attr(node, axis)}") while ${filling.map(label).join(", ")} fill it (${axis}="1fr"): neither gives the other a size, so Framer switches it to fixed and it breaks at other widths.`,
            `Give ${label(node)} a size on ${axis} (1fr or px) or make the children ${axis}="auto".`,
          ),
        ];
  });

/**
 * Whether an axis runs along the parent's layout (true), across it (false), or is not checked (null): a stack runs
 * along its direction, a grid along its width (its rows size to their cells), a frame without layout along both.
 */
function alongAxis(node: SerializedNode, axis: "width" | "height"): boolean | null {
  switch (layoutOf(node)) {
    case "stack":
      return (directionOf(node) === "horizontal") === (axis === "width");
    case "grid":
      return axis === "width" ? true : null;
    default:
      return true;
  }
}

/** Text inside a visible surface needs room from its edges. */
const edgeFlushText: NodeRule = (node) => {
  const [, right, , left] = paddingOf(node);

  return isFrame(node) && hasSurface(node) && childrenOf(node).some(isText) && (left === 0 || right === 0)
    ? [
        issue(
          "edge-flush-text",
          "defect",
          node,
          `Text in ${label(node)} touches its ${left === 0 ? "left" : "right"} edge: the surface has no horizontal padding.`,
          "Give the frame horizontal padding (cards 24–40px, buttons 16–24px).",
        ),
      ]
    : [];
};

/**
 * A component instance pinned to both sides of an axis still takes its own size, and an instance's default is auto: it
 * collapses to the component's content (seen: a hero video layer at 200 x 200). A frame stretches by its pins alone.
 */
const pinnedInstanceAuto: NodeRule = (node) => {
  if (node.type !== "ComponentInstanceNode" || inFlow(node)) {
    return [];
  }

  const axes = (
    [
      ["width", "left", "right"],
      ["height", "top", "bottom"],
    ] as const
  ).filter(
    ([size, start, end]) =>
      attr(node, start) !== null &&
      attr(node, end) !== null &&
      attr(node, start) !== "null" &&
      attr(node, end) !== "null" &&
      (attr(node, size) ?? "auto") === "auto",
  );

  return axes.length === 0
    ? []
    : [
        issue(
          "pinned-instance-auto",
          "defect",
          node,
          `${label(node)} is pinned to both sides but its ${axes.map(([size]) => size).join(" and ")} stays auto: an instance keeps its own size, so it collapses instead of filling its parent.`,
          `Give it ${axes.map(([size]) => `${size}="100%"`).join(" ")} with the pins.`,
        ),
      ];
};

/** An image frame without children and without a size collapses to nothing. */
const imageCollapse: NodeRule = (node) => {
  const image = attr(node, "backgroundImage") !== null || /^https?:|url\(/i.test(attr(node, "fill") ?? "");
  const height = sizeKind(attr(node, "height"));

  return isFrame(node) &&
    image &&
    childrenOf(node).length === 0 &&
    (height === "fit" || height === "unset") &&
    attr(node, "aspectRatio") === null
    ? [
        issue(
          "image-collapse",
          "defect",
          node,
          `${label(node)} holds an image but has no height of its own (no children, height auto, no aspectRatio): it collapses to nothing.`,
          'Give it width="1fr" with an aspectRatio and any px height, or a fixed height.',
        ),
      ]
    : [];
};

/** A card stretched to its row with centered content: neighbouring titles sit at different heights. */
const cardContentFloats: NodeRule = (node) => {
  const floating = childrenOf(node).filter(
    (card) =>
      isFrame(card) &&
      hasSurface(card) &&
      attr(card, "height") === "1fr" &&
      layoutOf(card) === "stack" &&
      directionOf(card) === "vertical" &&
      ["center", "end"].includes(attr(card, "stackDistribution") ?? "center"),
  );

  return floating.length < 2
    ? []
    : [
        issue(
          "card-content-floats",
          "likely",
          node,
          `${floating.length} cards in ${label(node)} stretch to their row but center their content, so their titles and buttons sit at different heights.`,
          'Set stackDistribution="start" on the cards; to put a button at the bottom, add a spacer with height="1fr" above it.',
        ),
      ];
};

/** Long text with width auto in a column does not wrap to the column's width. */
const autoWidthText: NodeRule = (node) =>
  layoutOf(node) === "stack" && directionOf(node) === "vertical"
    ? childrenOf(node)
        .filter(
          (child) =>
            isText(child) &&
            inFlow(child) &&
            sizeKind(attr(child, "width")) === "fit" &&
            (textContent(child)?.length ?? 0) >= AUTO_TEXT_CHARS,
        )
        .map((child) =>
          issue(
            "auto-width-text",
            "likely",
            child,
            `${label(child)} is a long text with width="auto" in a column: it does not wrap to the column and runs as wide as its longest line.`,
            'Use width="1fr" (with maxWidth for a reading measure).',
          ),
        )
    : [];

/** A fixed viewport height cuts content on short screens and long text; a sticky stage or fixed overlay means it. */
const fixedViewportHeight: NodeRule = (node) =>
  isFrame(node) && /vh$/.test(attr(node, "height") ?? "") && !VIEWPORT_POSITIONS.has(attr(node, "position") ?? "")
    ? [
        issue(
          "fixed-vh",
          "likely",
          node,
          `${label(node)} is exactly ${attr(node, "height")} high: on short screens or with longer text its content is cut.`,
          `Use height="auto" with minHeight="${attr(node, "height")}".`,
        ),
      ]
    : [];

/** A button's padding is symmetric, or its label sits off-centre. */
const buttonPadding: NodeRule = (node) => {
  const [top, right, bottom, left] = paddingOf(node);

  return isFrame(node) && attr(node, "link") !== null && hasSurface(node) && (top !== bottom || left !== right)
    ? [
        issue(
          "button-padding",
          "likely",
          node,
          `${label(node)} looks like a button but its padding is uneven (${attr(node, "padding")}), so the label sits off-centre.`,
          "Use symmetric padding (e.g. 12px 20px).",
        ),
      ]
    : [];
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
  fitParentFillChild,
  edgeFlushText,
  imageCollapse,
  pinnedInstanceAuto,
  cardContentFloats,
  autoWidthText,
  fixedViewportHeight,
  buttonPadding,
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

/** Header, sections and footer keep their content within one container width; a ticker runs edge to edge on purpose. */
const containerWidths: PageRule = (breakpoint) => {
  const sections = sectionsOf(breakpoint).filter(
    (section) =>
      sizeKind(attr(section, "width")) === "fill" && !walk(section).some((node) => hasEffect(node, "tickerEffect")),
  );
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

/** Top sites center about one heading in six; centering most of them reads as a template. */
const centeredEverything: PageRule = (breakpoint, context) => {
  const headingTexts = walk(breakpoint).filter(
    (node) => isText(node) && /^h[1-3]$/.test(context.textStyle(node.attributes?.["textStylePreset"])?.tag ?? ""),
  );
  const centered = headingTexts.filter((node) => textAnchorOf(node, context) === "center");

  return headingTexts.length >= CENTERED_MIN_HEADINGS && centered.length / headingTexts.length > CENTERED_SHARE_MAX
    ? [
        issue(
          "centered-everything",
          "taste",
          breakpoint,
          `${centered.length} of ${headingTexts.length} headings on ${label(breakpoint)} are centered; on top Framer sites about one in six is.`,
          "Left-align the sections and keep centered text for one or two moments (a manifesto line, the closing call to action).",
        ),
      ]
    : [];
};

/** A breakpoint's width when it is a tablet or phone one, else null. */
function narrowWidthOf(breakpoint: SerializedNode): number | null {
  const width = px(attr(breakpoint, "width"));

  return width !== null && width <= TABLET_MAX_WIDTH_PX ? width : null;
}

/** A grid keeps its desktop columns on a narrower breakpoint unless its copy there says otherwise. */
const narrowGrid: PageRule = (breakpoint) => {
  const width = narrowWidthOf(breakpoint);

  if (width === null) {
    return [];
  }

  const phone = width <= PHONE_MAX_WIDTH_PX;
  const most = phone ? PHONE_GRID_MAX_COLUMNS : TABLET_GRID_MAX_COLUMNS;

  return walk(breakpoint).flatMap((node) => {
    const columns = Number(attr(node, "gridColumnCount"));

    return layoutOf(node) === "grid" && Number.isInteger(columns) && columns > most
      ? [
          issue(
            "narrow-grid",
            phone ? "defect" : "likely",
            node,
            `${label(node)} keeps ${columns} columns at ${width}px, so each gets a sliver of the screen.`,
            phone
              ? `Override its copy on ${label(breakpoint)}: layout="stack" stackDirection="vertical" for cards with text, gridColumnCount="2" for small tiles.`
              : `Override its copy on ${label(breakpoint)} with gridColumnCount="${most}" or fewer.`,
          ),
        ]
      : [];
  });
};

/** Columns side by side in a horizontal stack get squeezed to slivers on a phone. */
const narrowRow: PageRule = (breakpoint) => {
  const width = narrowWidthOf(breakpoint);

  if (width === null || width > PHONE_MAX_WIDTH_PX) {
    return [];
  }

  return walk(breakpoint).flatMap((node) => {
    if (layoutOf(node) !== "stack" || directionOf(node) !== "horizontal" || attr(node, "stackWrapEnabled") === "true") {
      return [];
    }

    const columns = childrenOf(node).filter(isColumn);

    return columns.length >= 2
      ? [
          issue(
            "narrow-row",
            "likely",
            node,
            `${label(node)} puts ${columns.length} columns side by side at ${width}px.`,
            `Override its copy on ${label(breakpoint)}: stackDirection="vertical" with the columns at width="1fr", or stackWrapEnabled="true" when the items are small.`,
          ),
        ]
      : [];
  });
};

/**
 * A child of a row that takes width as content does: wide or filling, shown, and not a wrapper that only places
 * fit-width items (a wordmark, a button), which stays as small as they are wherever the row puts it.
 */
function isColumn(child: SerializedNode): boolean {
  const wide = sizeKind(attr(child, "width")) === "fill" || (px(attr(child, "width")) ?? 0) >= ROW_COLUMN_MIN_PX;
  const inner = childrenOf(child).filter(inFlow);
  const wrapper = inner.length > 0 && inner.every((item) => sizeKind(attr(item, "width")) === "fit");

  return inFlow(child) && attr(child, "visible") !== "false" && wide && !wrapper;
}

/** Desktop side padding on a phone leaves the content a strip. */
const narrowPadding: PageRule = (breakpoint) => {
  const width = narrowWidthOf(breakpoint);

  if (width === null || width > PHONE_MAX_WIDTH_PX) {
    return [];
  }

  const sections = sectionsOf(breakpoint);

  return [...sections, ...sections.flatMap(childrenOf)].filter(isFrame).flatMap((node) => {
    const [, right, , left] = paddingOf(node);

    return Math.max(left, right) > PHONE_SIDE_PADDING_MAX_PX
      ? [
          issue(
            "narrow-padding",
            "likely",
            node,
            `${label(node)} keeps ${left}px and ${right}px of side padding at ${width}px: the content gets ${width - left - right}px.`,
            `Override its copy on ${label(breakpoint)} with 16–24px at the sides, e.g. padding="64px 20px 64px 20px".`,
          ),
        ]
      : [];
  });
};

/** Text styles keep their desktop size on a phone unless they have a size for narrow widths. */
const narrowType: PageRule = (breakpoint, context) => {
  const width = narrowWidthOf(breakpoint);

  if (width === null || width > PHONE_MAX_WIDTH_PX) {
    return [];
  }

  const large = new Map<string, AuditTextStyle>();

  for (const node of walk(breakpoint).filter(isText)) {
    const style = context.textStyle(node.attributes?.["textStylePreset"]);

    if (style !== null && (style.narrowFontSize ?? 0) > PHONE_HEADING_MAX_PX) {
      large.set(style.name, style);
    }
  }

  return large.size === 0
    ? []
    : [
        issue(
          "narrow-type",
          "likely",
          breakpoint,
          `${[...large.values()].map((style) => `"${style.name}" (${style.narrowFontSize}px)`).join(", ")} keep their desktop size at ${width}px: long words break and a headline fills the screen.`,
          `Give these text styles a phone size with text_styles_upsert breakpoints, about half the desktop size and at most ${PHONE_HEADING_MAX_PX}px, once the page has its breakpoints.`,
        ),
      ];
};

/** Checks of each breakpoint's own layout: copies of the primary breakpoint get their own. */
export const BREAKPOINT_RULES: readonly PageRule[] = [
  containerWidths,
  sectionRhythm,
  narrowGrid,
  narrowRow,
  narrowPadding,
  narrowType,
];

/** Checks of the page's content, once on the primary breakpoint: the others show the same content. */
export const CONTENT_RULES: readonly PageRule[] = [headings, templateHabits, noImagery, centeredEverything];

/** Checks on the project's text styles as a whole. */
export function projectIssues(page: SerializedNode, context: AuditContext): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const display = context.textStyles.filter((style) => (style.fontSize ?? 0) >= DISPLAY_SIZE_PX);
  const loose = display.filter(
    (style) => (style.letterSpacing ?? 0) >= 0 || (style.lineHeight ?? 0) > DISPLAY_LINE_HEIGHT_MAX,
  );

  if (loose.length > 0) {
    issues.push(
      issue(
        "display-type",
        "taste",
        page,
        `${loose.map((style) => `"${style.name}"`).join(", ")} set display type with default tracking or loose lines: the generated look (Inter itself is fine; Inter at tracking 0 and line height 1.2 is not).`,
        "Display sizes (40px and up) get tracking −0.02…−0.06em and line height 0.9–1.1.",
      ),
    );
  }

  const headingSizes = context.textStyles
    .filter((style) => /^h[1-2]$/.test(style.tag))
    .flatMap((style) => (style.fontSize === null ? [] : [style.fontSize]));
  // A paragraph style above body size is a quote or a lead: measuring against it would hide a strong hierarchy.
  const bodySizes = context.textStyles
    .filter((style) => style.tag === "p")
    .flatMap((style) =>
      style.fontSize === null || style.fontSize < BODY_SIZE_MIN_PX || style.fontSize > BODY_SIZE_MAX_PX
        ? []
        : [style.fontSize],
    );

  if (headingSizes.length > 0 && bodySizes.length > 0) {
    const ratio = Math.max(...headingSizes) / Math.max(...bodySizes);

    if (ratio < HIERARCHY_RATIO_MIN) {
      issues.push(
        issue(
          "flat-hierarchy",
          "taste",
          page,
          `The largest heading is ${ratio.toFixed(1)}× the body size: nothing dominates (top Framer sites: about 6.5×).`,
          "Make the display heading at least 4× the body size, with fewer sizes in between.",
        ),
      );
    }
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
