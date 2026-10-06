import * as z from "zod";
import { TEXT_CONTENT_DEPTH } from "../../constants/history.ts";
import { withTextHistory } from "../../history/dsl/dsl-history.ts";
import { readNodes } from "../../history/dsl/read-nodes.ts";
import { fromPluginNode } from "../../plugin-nodes/attributes.ts";
import { idOf, nameOf, textOf } from "../../plugin-nodes/node-record.ts";
import { walkPage } from "../../plugin-nodes/walk.ts";
import { TextChangeSchema } from "../../schemas/site.ts";
import type { AgentPort, FramerRuntime } from "../../types/framer.ts";
import type { OperationContext } from "../../types/operations.ts";
import type { TextChange, TextFormatting, TextMatch, TextWrites } from "../../types/site.ts";
import { errorMessage } from "../../utils/errors.ts";
import { countOf } from "../../utils/text.ts";
import { replaceFormatting, replaceText, spellingsToSend } from "../../utils/text-replace.ts";
import { inlineText } from "../../xml/xml-entities.ts";
import { defineOperation } from "../define.ts";
import { designApply } from "../design/apply.ts";
import { pagesToSearch } from "./find.ts";

interface ReplaceOptions {
  readonly find: string;
  readonly replace: string;
  readonly matchCase: boolean;
}

/**
 * Replaces text in text layers across pages, breakpoint copies that hold their own text included. With the Server
 * API key, framer.agent.replaceText edits each layer in place, so bold, links and lists stay; without it the layers
 * are rewritten as plain text through design_apply. Either way the journal can undo it.
 */
export const textReplace = defineOperation({
  name: "text.replace",
  effect: "write",
  idempotent: false,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    find: z.string().min(1).describe("The text to find inside text layers."),
    replace: z.string().describe("What it becomes; an empty string removes it."),
    pagePath: z.string().startsWith("/").exactOptional().describe("One page; omit for every web page."),
    matchCase: z.boolean().default(false),
    dryRun: z.boolean().default(false).describe("Only list what would change."),
  }),
  output: z.object({
    replaced: z.number().int(),
    changes: z.array(TextChangeSchema),
    /** Layers or pages Framer did not change, with why. */
    failed: z.array(z.string()),
  }),
  async run(context, { find, replace, pagePath, matchCase, dryRun }) {
    const options = {
      find,
      replace,
      matchCase,
    };
    const { runtime } = context;
    const matches = await findMatches(runtime, pagePath, options);
    const primary = matches.filter((match) => match.breakpoint === null);
    const copies = matches.filter((match) => match.breakpoint !== null);
    const formatting = await formattingOf(runtime.agent, matches, options);
    const changeOf = (match: TextMatch): TextChange => ({
      id: match.id,
      page: match.page,
      breakpoint: match.breakpoint,
      before: match.before,
      after: match.after,
      formatting: formatting.get(match.id) ?? "kept",
    });

    if (dryRun || matches.length === 0) {
      return {
        replaced: 0,
        changes: [...primary, ...copies.filter((copy) => holdsOwnText(copy, primary))].map(changeOf),
        failed: [],
      };
    }

    const write = (round: readonly TextMatch[]) =>
      runtime.agent === null ? writePlain(context, round) : writeInPlace(context, runtime.agent, round, options);
    const first = await write(primary);
    // A copy that follows its original changed with it; one that still shows its old text holds its own.
    const holding: TextMatch[] = [];

    for (const copy of copies) {
      if ((await textOf(copy.node)) === copy.before) {
        holding.push(copy);
      }
    }

    const second = await write(holding);

    return {
      replaced: first.replaced.length + second.replaced.length,
      changes: [...primary, ...holding].map(changeOf),
      failed: [...first.failed, ...second.failed],
    };
  },
  describe({ find, replace, dryRun }, { changes, replaced }) {
    return {
      subject: `“${find}” → “${replace}”`,
      summary: dryRun ? `${countOf(changes.length, "text")} would change` : `${countOf(replaced, "text")} changed`,
    };
  },
  refused({ failed, replaced }) {
    return failed.length > 0 && replaced === 0 ? failed.join("; ") : null;
  },
});

/** Every text layer holding the text, on every breakpoint: the primary's first in each page, then the copies'. */
async function findMatches(
  runtime: FramerRuntime,
  pagePath: string | undefined,
  { find, replace, matchCase }: ReplaceOptions,
): Promise<TextMatch[]> {
  const { port } = runtime;
  const matches: TextMatch[] = [];

  for (const page of await pagesToSearch(port, pagePath)) {
    await walkPage(
      port,
      page.id,
      async (node, breakpoint) => {
        if (fromPluginNode(node, null).type !== "RichTextNode") {
          return;
        }

        const before = await textOf(node);
        const after = before === null ? null : replaceText(before, find, replace, matchCase);
        const copy = breakpoint !== null && !breakpoint.isPrimaryBreakpoint;

        if (before !== null && after !== null) {
          matches.push({
            node,
            id: idOf(node),
            page: page.path ?? "",
            breakpoint: copy ? (nameOf(breakpoint) ?? String(breakpoint.id)) : null,
            originalId: copy && typeof node.originalId === "string" ? node.originalId : null,
            before,
            after,
          });
        }
      },
      { copies: true },
    );
  }

  return matches;
}

/** Whether a copy's text is its own: its original holds another text, or does not hold the text at all. */
function holdsOwnText(copy: TextMatch, primary: readonly TextMatch[]): boolean {
  return primary.find((match) => match.id === copy.originalId)?.before !== copy.before;
}

/** What each replacement does to its layer's formatting: read from the runs with the key, plain text without it. */
async function formattingOf(
  agent: AgentPort | null,
  matches: readonly TextMatch[],
  { find, matchCase }: ReplaceOptions,
): Promise<Map<string, TextFormatting>> {
  if (agent === null) {
    return new Map(matches.map(({ id }) => [id, "plain"]));
  }

  const formatting = new Map<string, TextFormatting>();

  for (const [page, onPage] of byPage(matches)) {
    // Only the preview reads the runs: without them a replacement still keeps what is inside each run.
    const content = await readNodes(
      agent,
      page,
      onPage.map(({ id }) => id),
      TEXT_CONTENT_DEPTH,
    ).catch(() => new Map());

    for (const { id } of onPage) {
      formatting.set(id, replaceFormatting(content.get(id) ?? null, find, matchCase));
    }
  }

  return formatting;
}

/**
 * framer.agent.replaceText on each layer, once per spelling of the text (it matches exactly), journaled per page as
 * the layers' content before and after.
 */
async function writeInPlace(
  { history }: OperationContext,
  agent: AgentPort,
  matches: readonly TextMatch[],
  { find, replace, matchCase }: ReplaceOptions,
): Promise<TextWrites> {
  const replaced: TextMatch[] = [];
  const failed: string[] = [];

  for (const [page, onPage] of byPage(matches)) {
    const run = async () => {
      for (const match of onPage) {
        const spellings = spellingsToSend(match.before, find, replace, matchCase);

        if (spellings === null) {
          failed.push(
            `${labelOf(match)}: “${replace}” holds two spellings of “${find}”, so replacing them one by one would replace the new text again; use matchCase.`,
          );
          continue;
        }

        try {
          let changed = false;

          for (const spelling of spellings) {
            changed =
              (await agent.replaceText(
                {
                  id: match.id,
                  searchText: spelling,
                  replaceText: replace,
                },
                { pagePath: page },
              )) || changed;
          }

          if (changed) {
            replaced.push(match);
          } else {
            failed.push(`${labelOf(match)}: Framer found no “${find}” in it any more.`);
          }
        } catch (error) {
          failed.push(`${labelOf(match)}: ${errorMessage(error)}`);
        }
      }
    };

    await (history === undefined
      ? run()
      : withTextHistory(
          {
            history,
            agent,
            pagePath: page,
          },
          onPage.map(({ id }) => id),
          run,
        ));
  }

  return {
    replaced,
    failed,
  };
}

/** Without framer.agent: each page's layers rewritten as plain text in one design_apply batch, which journals them. */
async function writePlain(context: OperationContext, matches: readonly TextMatch[]): Promise<TextWrites> {
  const replaced: TextMatch[] = [];
  const failed: string[] = [];

  for (const [page, onPage] of byPage(matches)) {
    const result = await designApply.run(context, {
      xml: onPage.map(({ id, after }) => `<RichTextNode id="${id}">${inlineText(after)}</RichTextNode>`).join("\n"),
      pagePath: page,
    });

    if (result.ok) {
      replaced.push(...onPage);
    } else {
      failed.push(`${page}: ${result.message}`);
    }
  }

  return {
    replaced,
    failed,
  };
}

function byPage(matches: readonly TextMatch[]): Map<string, TextMatch[]> {
  const pages = new Map<string, TextMatch[]>();

  for (const match of matches) {
    pages.set(match.page, [...(pages.get(match.page) ?? []), match]);
  }

  return pages;
}

function labelOf({ page, breakpoint, id }: TextMatch): string {
  return `${page}${breakpoint === null ? "" : ` (${breakpoint})`} ${id}`;
}
