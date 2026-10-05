/** `text` with every `find` replaced, in any case unless `matchCase`; null when it has none. */
export function replaceText(text: string, find: string, replacement: string, matchCase: boolean): string | null {
  const pattern = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), matchCase ? "g" : "gi");

  if (!pattern.test(text)) {
    return null;
  }

  pattern.lastIndex = 0;

  return text.replace(pattern, () => replacement);
}
