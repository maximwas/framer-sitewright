import type { DslCommand, DslLintIssue } from "../types/dsl.ts";

/** The layers a batch touched, by their real ids: the commands' targets and the parents new layers went into. */
export function touchedLayers(
  commands: readonly DslCommand[],
  renamedIds: Readonly<Record<string, string>>,
): Set<string> {
  const real = (id: string) => renamedIds[id] ?? id;

  return new Set(
    commands.flatMap((command) => [
      real(command.id),
      ...(command.attributes["parent"] === undefined ? [] : [real(command.attributes["parent"])]),
    ]),
  );
}

/**
 * Framer's lint findings about the layers given, and how many it left out: Framer lints the whole page after every
 * batch, so one DEL answered with 105 findings about the breakpoint copies and old contrasts (seen 22.10.2026).
 */
export function lintOnLayers(
  lint: readonly DslLintIssue[],
  layers: ReadonlySet<string>,
): { lint: DslLintIssue[]; left: number } {
  let left = 0;
  const kept = lint.flatMap((issue) => {
    const details = issue.details.filter((detail) => {
      const text = JSON.stringify(detail);

      return [...layers].some((id) => text.includes(`"${id}"`));
    });

    left += issue.details.length - details.length;

    return details.length === 0
      ? []
      : [
          {
            ...issue,
            details,
          },
        ];
  });

  return {
    lint: kept,
    left,
  };
}
