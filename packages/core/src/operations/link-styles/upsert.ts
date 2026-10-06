import * as z from "zod";
import { LINK_STYLE_NODE_TYPE } from "../../constants/link-styles.ts";
import { addNode, setNode } from "../../dsl/commands.ts";
import { nextTempId } from "../../dsl/temp-ids.ts";
import { linkStyleKind, withStyleHistory } from "../../history/style-history.ts";
import { LinkStyleInputSchema } from "../../schemas/link-styles.ts";
import { StyleUpsertOutputSchema } from "../../schemas/styles.ts";
import { applyDslBatch } from "../../styles/dsl-batch.ts";
import { readLinkStyles } from "../../styles/link-styles.ts";
import { indexByPath } from "../../styles/style-index.ts";
import { describePlan } from "../../styles/style-refs.ts";
import { defineOperation } from "../define.ts";
import { normalizeLinkStyles, planLinkStyles } from "./plan.ts";

export const linkStylesUpsert = defineOperation({
  name: "linkStyles.upsert",
  effect: "write",
  idempotent: true,
  permissions: [],
  // Link styles exist only in the DSL: the Plugin API can neither see nor make them.
  needsAgent: true,
  input: z.strictObject({
    styles: z.array(LinkStyleInputSchema).min(1).max(50),
    dryRun: z.boolean().default(false).describe("Only return the plan, change nothing."),
  }),
  output: StyleUpsertOutputSchema,
  async run({ runtime, history }, { styles, dryRun }) {
    const requests = normalizeLinkStyles(styles);
    const [existing, tokens] = await Promise.all([indexByPath(readLinkStyles(runtime)), runtime.port.getColorStyles()]);
    const plan = planLinkStyles(requests, existing, tokens);
    const creates = plan.creates.map((create) => ({
      ...create,
      tempId: nextTempId(runtime, "link"),
    }));
    const commands = [
      ...creates.map(({ tempId, path, attributes }) =>
        addNode(LINK_STYLE_NODE_TYPE, tempId, {
          name: path,
          ...attributes,
        }),
      ),
      ...plan.updates.map(({ style, attributes }) => setNode(style.id, attributes)),
    ];
    const outcome = await withStyleHistory(
      {
        history,
        runtime,
        kind: linkStyleKind,
        before: existing,
        paths: requests.map((style) => style.path),
        dryRun,
      },
      () =>
        applyDslBatch(
          runtime,
          {
            commands,
            creates,
          },
          dryRun,
        ),
    );

    return {
      ...describePlan(plan),
      ...outcome,
      dryRun,
      via: "dsl" as const,
    };
  },
});
