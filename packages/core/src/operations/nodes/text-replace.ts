import * as z from "zod";
import { fromPluginNode } from "../../plugin-nodes/attributes.ts";
import { idOf, textOf } from "../../plugin-nodes/node-record.ts";
import { walkPage } from "../../plugin-nodes/walk.ts";
import { TextChangeSchema } from "../../schemas/site.ts";
import type { TextChange } from "../../types/site.ts";
import { countOf } from "../../utils/text.ts";
import { replaceText } from "../../utils/text-replace.ts";
import { inlineText } from "../../xml/xml-entities.ts";
import { defineOperation } from "../define.ts";
import { designApply } from "../design/apply.ts";
import { pagesToSearch } from "./find.ts";

/**
 * Replaces text in text layers across pages. The changes go through design_apply as XML, so the journal can undo them
 * and the Server API's DSL or the Plugin API writes them, whichever is there.
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
    /** Pages whose batch Framer refused, with why. */
    failed: z.array(z.string()),
  }),
  async run(context, { find, replace, pagePath, matchCase, dryRun }) {
    const { port } = context.runtime;
    const changes: TextChange[] = [];

    for (const page of await pagesToSearch(port, pagePath)) {
      await walkPage(port, page.id, async (node) => {
        if (fromPluginNode(node, null).type !== "RichTextNode") {
          return;
        }

        const before = await textOf(node);
        const after = before === null ? null : replaceText(before, find, replace, matchCase);

        if (before !== null && after !== null) {
          changes.push({
            id: idOf(node),
            page: page.path ?? "",
            before,
            after,
          });
        }
      });
    }

    if (dryRun || changes.length === 0) {
      return {
        replaced: 0,
        changes,
        failed: [],
      };
    }

    const failed: string[] = [];
    let replaced = 0;

    for (const page of [...new Set(changes.map((change) => change.page))]) {
      const onPage = changes.filter((change) => change.page === page);
      const xml = onPage
        .map(({ id, after }) => `<RichTextNode id="${id}">${inlineText(after)}</RichTextNode>`)
        .join("\n");
      const result = await designApply.run(context, {
        xml,
        pagePath: page,
      });

      if (result.ok) {
        replaced += onPage.length;
      } else {
        failed.push(`${page}: ${result.message}`);
      }
    }

    return {
      replaced,
      changes,
      failed,
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
