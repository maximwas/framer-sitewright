/** One find-and-replace in a code file. */
export interface CodeEdit {
  readonly find: string;
  readonly replace: string;
  readonly all?: boolean;
}

/**
 * The file after the edits, in order. An edit whose text is missing, or found more than once without `all`, fails the
 * whole patch: a wrong guess must not land half the change.
 */
export function patchCode(code: string, edits: readonly CodeEdit[]): { code: string; failed: string[] } {
  let next = code;
  const failed: string[] = [];

  edits.forEach(({ find, replace, all }, index) => {
    const count = next.split(find).length - 1;

    if (count === 0) {
      failed.push(`edit ${index + 1}: its find text is not in the file`);
    } else if (count > 1 && all !== true) {
      failed.push(`edit ${index + 1}: its find text is there ${count} times; give more context or all: true`);
    } else {
      next = all === true ? next.replaceAll(find, replace) : next.replace(find, () => replace);
    }
  });

  return {
    code: next,
    failed,
  };
}
