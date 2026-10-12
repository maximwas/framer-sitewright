import { TOKEN_TYPO_DISTANCE } from "../../constants/dsl.ts";
import { TOKEN_REFERENCE } from "../../constants/history.ts";
import { OperationError } from "../../errors.ts";
import type { DslCommand } from "../../types/dsl.ts";
import type { FramerPort } from "../../types/framer-port.ts";
import { nearest } from "../../utils/edit-distance.ts";

/**
 * Refuses a batch that names a color token the project lacks. Framer takes `var(--token-<id>)` of any id without an
 * error and draws the default color instead (a typo, b719… for b619…, turned text black, seen 12.10.2026), so the batch
 * stops before anything is written, naming the token each unknown id most likely meant. Tokens the batch creates count.
 */
export async function refuseUnknownTokens(port: FramerPort, commands: readonly DslCommand[]): Promise<void> {
  const created = new Set(commands.filter((command) => command.verb === "ADD").map((command) => command.id));
  const named = new Set(
    commands.flatMap((command) =>
      Object.values(command.attributes).flatMap((value) =>
        [...value.matchAll(TOKEN_REFERENCE)].flatMap((match) => (match[1] === undefined ? [] : [match[1]])),
      ),
    ),
  );
  const asked = [...named].filter((id) => !created.has(id));

  if (asked.length === 0) {
    return;
  }

  const tokens = await port.getColorStyles();
  const unknown = asked.filter((id) => !tokens.some((token) => token.id === id));

  if (unknown.length === 0) {
    return;
  }

  const guesses = unknown.flatMap((id) => {
    const likely = nearest(id, tokens, (token) => token.id, TOKEN_TYPO_DISTANCE);

    return likely === null ? [] : [`${id} → ${likely.id} (${likely.path.replace(/^\//, "")})`];
  });

  throw new OperationError(
    "INVALID_INPUT",
    `No color token has the id ${unknown.join(", ")}: Framer would take it and draw its default color. Nothing was applied.`,
    [
      ...(guesses.length === 0 ? [] : [`Did you mean ${guesses.join(", ")}?`]),
      "Take token ids from color_tokens_list; a token made in the editor after this session connected needs framer_connect { reconnect: true }.",
    ].join(" "),
  );
}
