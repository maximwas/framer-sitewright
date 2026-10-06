import * as z from "zod";
import { CLONE_DETACH_ROUNDS } from "../../constants/copy-styles.ts";
import { dslId, dslString } from "../../dsl/escape.ts";
import { OperationError } from "../../errors.ts";
import { requireAgent } from "../../framer/runtime.ts";
import { serializedList } from "../../history/dsl/serialized.ts";
import { componentDetach } from "../components/detach.ts";
import { defineOperation } from "../define.ts";
import { designApply } from "../design/apply.ts";

const CLONE_KEY = "sitewright_clone";

export const nodesClone = defineOperation({
  name: "nodes.clone",
  effect: "write",
  idempotent: false,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    nodeId: z.string().min(1).describe("The layer to copy, with everything inside it."),
    parentId: z.string().min(1).describe("Where the copy goes: a frame or breakpoint, on this page or another."),
    pagePath: z.string().startsWith("/").default("/").describe("The page of parentId."),
    detach: z
      .boolean()
      .default(true)
      .describe("Replace the copy's component instances with their layers, so it no longer follows any component."),
  }),
  output: z.object({
    nodeId: z.string(),
    detached: z.number().int(),
    note: z.string().nullable(),
  }),
  async run(context, { nodeId, parentId, pagePath, detach }) {
    const result = await designApply.run(context, {
      dsl: `DUPE ${dslId(nodeId)} newId=${dslString(CLONE_KEY)} parent=${dslString(parentId)};`,
      pagePath,
    });
    const copy = result.renamedIds[CLONE_KEY];

    if (!result.ok || copy === undefined) {
      throw new OperationError("WRITE_FAILED", `Framer did not copy ${nodeId}: ${result.message}`);
    }

    if (!detach) {
      return {
        nodeId: copy,
        detached: 0,
        note: null,
      };
    }

    const agent = requireAgent(context.runtime);
    let detached = 0;

    // A detached instance can hold instances of its own: detach until none are left, a few rounds at most.
    for (let round = 0; round < CLONE_DETACH_ROUNDS; round++) {
      const instances = serializedList(
        await agent.getDescendantsOfTypes(
          {
            id: copy,
            types: ["ComponentInstanceNode"],
          },
          { pagePath },
        ),
      );

      if (instances.length === 0) {
        return {
          nodeId: copy,
          detached,
          note: null,
        };
      }

      for (const { id } of instances) {
        await componentDetach.run(context, { nodeId: id });
        detached++;
      }
    }

    return {
      nodeId: copy,
      detached,
      note: "Some instances are still inside the copy: detach them with component_detach.",
    };
  },
  describe({ nodeId }, { detached }) {
    return {
      subject: nodeId,
      summary: detached === 0 ? "Copied" : `Copied, ${detached} instances detached`,
    };
  },
});
