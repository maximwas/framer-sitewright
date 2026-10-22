/** How many code files one code_files_read call returns. */
export const CODE_FILES_READ_MAX = 25;

/** How many find-and-replace edits one code_file_patch call takes. */
export const CODE_PATCH_EDITS_MAX = 50;

/**
 * The lines code_files_read's outline keeps: what a file declares (exports, functions, types, classes) and the keys of
 * its property controls, indented once inside addPropertyControls.
 */
export const CODE_OUTLINE_LINE =
  /^(?:export\b|(?:async\s+)?function\b|interface\b|type\b|class\b|const\s+[A-Z]\w*\s*=|addPropertyControls\b|\s{2,4}\w+:\s*\{)/;

/** The one lint rule Framer had, for the files it still lints. */
export const CODE_LINT_RULES = { "forbid-browser-apis": "warning" } as const;
