/**
 * Icon names that fit a query, best first. Names holding every query word win; only when none does, names holding
 * some of them are offered. Within a group, a name starting with the first word ranks higher ("Arrow Right" over
 * "Caret Arrow Right"), then the shorter name.
 */
export function matchIcons(names: readonly string[], query: string, limit: number): string[] {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word !== "");
  const [first = ""] = words;
  const scored = names.map((name) => {
    const lower = name.toLowerCase();

    return {
      name,
      hits: words.filter((word) => lower.includes(word)).length,
      leads: lower.startsWith(first) ? 1 : 0,
    };
  });
  const complete = scored.filter(({ hits }) => hits === words.length);
  const pool = complete.length > 0 ? complete : scored.filter(({ hits }) => hits > 0);

  return pool
    .sort((left, right) => right.hits - left.hits || right.leads - left.leads || left.name.length - right.name.length)
    .slice(0, limit)
    .map(({ name }) => name);
}
