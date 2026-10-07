/** How many code files one code_files_read call returns. */
export const CODE_FILES_READ_MAX = 25;

/** How many find-and-replace edits one code_file_patch call takes. */
export const CODE_PATCH_EDITS_MAX = 50;

/** The one lint rule Framer had, for the files it still lints. */
export const CODE_LINT_RULES = { "forbid-browser-apis": "warning" } as const;
