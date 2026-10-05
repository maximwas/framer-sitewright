import * as z from "zod";
import { REDIRECTS_UNDO_NOTE } from "../../constants/nodes.ts";
import { RedirectSchema } from "../../schemas/site.ts";
import type { RedirectData, RedirectWrite } from "../../types/framer-port.ts";
import type { RedirectSummary } from "../../types/site.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

function summaryOf({ from, to, expandToAllLocales }: RedirectData): RedirectSummary {
  return {
    from,
    to,
    allLocales: expandToAllLocales,
  };
}

export const redirectsList = defineOperation({
  name: "redirects.list",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({}),
  output: z.object({ redirects: z.array(RedirectSchema) }),
  async run({ runtime }) {
    return { redirects: (await runtime.port.getRedirects()).map(summaryOf) };
  },
  describe(_input, { redirects }) {
    return { summary: countOf(redirects.length, "redirect") };
  },
});

export const redirectsSet = defineOperation({
  name: "redirects.set",
  effect: "destructive",
  idempotent: true,
  permissions: ["addRedirects", "removeRedirects"],
  input: z.strictObject({
    set: z
      .array(
        z.strictObject({
          from: z.string().startsWith("/").describe('The old path, e.g. "/old-blog/*" or "/pricing-2024".'),
          to: z.string().min(1).describe('Where it goes: a path like "/blog" or a full URL.'),
          allLocales: z.boolean().exactOptional().describe("Also for every locale's version of the path."),
        }),
      )
      .default([])
      .describe("Redirects to add; one whose from already has a redirect changes it."),
    remove: z.array(z.string().startsWith("/")).default([]).describe("Redirects to remove, by their from path."),
  }),
  output: z.object({
    added: z.array(z.string()),
    updated: z.array(z.string()),
    removed: z.array(z.string()),
    /** From paths to remove that had no redirect. */
    missing: z.array(z.string()),
    /** The changed and removed redirects as they were, for putting them back. */
    previous: z.array(RedirectSchema),
  }),
  async run({ runtime, history }, { set, remove }) {
    const { port } = runtime;
    const existing = await port.getRedirects();
    const byFrom = new Map(existing.map((redirect) => [redirect.from, redirect]));
    const writes: RedirectWrite[] = set.map(({ from, to, allLocales }) => {
      const current = byFrom.get(from);

      return current === undefined
        ? {
            from,
            to,
            expandToAllLocales: allLocales ?? false,
          }
        : {
            id: current.id,
            to,
            ...(allLocales === undefined ? {} : { expandToAllLocales: allLocales }),
          };
    });
    const removing = remove.flatMap((from) => {
      const current = byFrom.get(from);

      return current === undefined ? [] : [current];
    });

    if (writes.length > 0 || removing.length > 0) {
      history?.markIncomplete(REDIRECTS_UNDO_NOTE);
    }

    if (writes.length > 0) {
      await port.addRedirects(writes);
    }

    if (removing.length > 0) {
      await port.removeRedirects(removing.map(({ id }) => id));
    }

    const updated = set.filter(({ from }) => byFrom.has(from)).map(({ from }) => from);

    return {
      added: set.filter(({ from }) => !byFrom.has(from)).map(({ from }) => from),
      updated,
      removed: removing.map(({ from }) => from),
      missing: remove.filter((from) => !byFrom.has(from)),
      previous: [...updated.flatMap((from) => [byFrom.get(from)]), ...removing]
        .filter((redirect) => redirect !== undefined)
        .map(summaryOf),
    };
  },
  describe(_input, { added, updated, removed }) {
    return {
      summary: [
        added.length > 0 ? `${countOf(added.length, "redirect")} added` : null,
        updated.length > 0 ? `${countOf(updated.length, "redirect")} changed` : null,
        removed.length > 0 ? `${countOf(removed.length, "redirect")} removed` : null,
      ]
        .filter((part) => part !== null)
        .join(", "),
    };
  },
});
