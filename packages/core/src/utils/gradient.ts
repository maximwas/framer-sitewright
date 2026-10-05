import type { GradientSpec } from "../types/framer.ts";

/** CSS direction keywords as degrees. */
const DIRECTIONS: Readonly<Record<string, number>> = {
  "to top": 0,
  "to top right": 45,
  "to right top": 45,
  "to right": 90,
  "to bottom right": 135,
  "to right bottom": 135,
  "to bottom": 180,
  "to bottom left": 225,
  "to left bottom": 225,
  "to left": 270,
  "to top left": 315,
  "to left top": 315,
};

/**
 * A CSS `linear-gradient(...)` as Framer's stops: the angle in degrees (180 when none is given), each stop's color as
 * written (a token stays `var(--token-…)`), positions from 0 to 1; a stop without one is spread between its
 * neighbours, as CSS does. null for anything else (radial, conic, malformed).
 */
export function parseLinearGradient(css: string): GradientSpec | null {
  const body = /^linear-gradient\((.*)\)$/s.exec(css.trim())?.[1];

  if (body === undefined) {
    return null;
  }

  const parts = splitTopLevel(body);
  const head = parts[0]?.trim().toLowerCase() ?? "";
  const degrees = /^(-?\d+(?:\.\d+)?)deg$/.exec(head);
  const angle = degrees?.[1] !== undefined ? Number(degrees[1]) : DIRECTIONS[head];
  const stopParts = angle === undefined ? parts : parts.slice(1);
  const stops = stopParts.map((part) => {
    const match = /^(.*?)\s+(-?\d+(?:\.\d+)?)%$/s.exec(part.trim());

    return match?.[1] !== undefined && match[2] !== undefined
      ? {
          color: match[1].trim(),
          position: Number(match[2]) / 100,
        }
      : {
          color: part.trim(),
          position: null,
        };
  });

  if (stops.length < 2 || stops.some(({ color }) => color === "")) {
    return null;
  }

  return {
    kind: "linear",
    angle: angle ?? 180,
    stops: spread(stops),
  };
}

/** Commas that separate the gradient's parts, not the ones inside rgba(…) or var(…). */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
    } else if (char === "," && depth === 0) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }

  return [...parts, text.slice(start)];
}

/** Positions for stops that have none: the first at 0, the last at 1, the ones between evenly between known ones. */
function spread(stops: readonly { color: string; position: number | null }[]): { color: string; position: number }[] {
  const positions = stops.map(
    ({ position }, index) => position ?? (index === 0 ? 0 : index === stops.length - 1 ? 1 : null),
  );

  for (let index = 1; index < positions.length - 1; index += 1) {
    if (positions[index] !== null) {
      continue;
    }

    const before = index - 1;
    let after = index + 1;

    while (positions[after] === null) {
      after += 1;
    }

    const from = positions[before] ?? 0;
    const to = positions[after] ?? 1;

    for (let gap = index; gap < after; gap += 1) {
      positions[gap] = from + ((to - from) * (gap - before)) / (after - before);
    }
  }

  return stops.map(({ color }, index) => ({
    color,
    position: Math.round((positions[index] ?? 0) * 10_000) / 10_000,
  }));
}
