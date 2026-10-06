import * as z from "zod";
import { OperationError } from "../../errors.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { pagesToSearch } from "./find.ts";

interface SuggestingPage {
  getBreakpointSuggestions(): Promise<readonly { readonly name: string; readonly width: number }[]>;
}

function suggests(value: unknown): value is SuggestingPage {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>)["getBreakpointSuggestions"] === "function"
  );
}

export const breakpointsSuggest = defineOperation({
  name: "breakpoints.suggest",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({ pagePath: z.string().startsWith("/").default("/").describe('The web page, e.g. "/about".') }),
  output: z.object({
    pagePath: z.string(),
    suggestions: z.array(
      z.object({
        name: z.string(),
        width: z.number(),
      }),
    ),
  }),
  async run({ runtime }, { pagePath }) {
    const [page] = await pagesToSearch(runtime.port, pagePath);
    const node = page === undefined ? null : await runtime.port.getNode(page.id);

    if (!suggests(node)) {
      throw new OperationError("UNSUPPORTED_TRANSPORT", "This Framer connection cannot suggest breakpoints.");
    }

    return {
      pagePath,
      suggestions: (await node.getBreakpointSuggestions()).map(({ name, width }) => ({
        name,
        width,
      })),
    };
  },
  describe({ pagePath }, { suggestions }) {
    return {
      subject: pagePath,
      summary: countOf(suggestions.length, "suggestion"),
    };
  },
});
