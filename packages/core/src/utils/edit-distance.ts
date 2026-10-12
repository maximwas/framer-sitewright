/** How many single-character edits turn one string into the other (Levenshtein). */
export function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];

    for (let j = 1; j <= b.length; j++) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);

      current.push(Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution));
    }

    previous = current;
  }

  return previous[b.length] ?? 0;
}

/** The candidate closest to `wanted`, if it is within `limit` edits. */
export function nearest<T>(
  wanted: string,
  candidates: readonly T[],
  key: (candidate: T) => string,
  limit: number,
): T | null {
  let best: { candidate: T; distance: number } | null = null;

  for (const candidate of candidates) {
    const distance = editDistance(wanted, key(candidate));

    if (distance <= limit && (best === null || distance < best.distance)) {
      best = {
        candidate,
        distance,
      };
    }
  }

  return best?.candidate ?? null;
}
