import * as z from "zod";
import { fromPluginNode } from "../../plugin-nodes/attributes.ts";
import { idOf, nameOf } from "../../plugin-nodes/node-record.ts";
import { pageLayers } from "../../plugin-nodes/walk.ts";
import type { PluginNodeRecord } from "../../types/plugin-nodes.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { pagesToSearch } from "../nodes/find.ts";

const InstanceSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  page: z.string(),
  component: z.string().nullable(),
});

/** Whether an instance is of the wanted component: its id inside the identifier, or its name in any case. */
function isOf(node: PluginNodeRecord, wanted: string): boolean {
  const identifier = typeof node["componentIdentifier"] === "string" ? node["componentIdentifier"] : "";
  const name = typeof node["componentName"] === "string" ? node["componentName"] : "";

  return identifier.split(/[/:]/).includes(wanted) || name.toLowerCase() === wanted.toLowerCase();
}

export const componentInstances = defineOperation({
  name: "components.instances",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({
    component: z
      .string()
      .min(1)
      .describe('The component\'s id (components_read lists it) or its name, e.g. "Content/Card".'),
    pagePath: z.string().startsWith("/").exactOptional().describe("One page; omit to look through every web page."),
  }),
  output: z.object({
    instances: z.array(InstanceSchema),
    /** The walk stopped on a very large page. */
    truncated: z.boolean(),
  }),
  async run({ runtime }, { component, pagePath }) {
    const instances: z.output<typeof InstanceSchema>[] = [];
    let complete = true;

    for (const page of await pagesToSearch(runtime.port, pagePath)) {
      const { layers, complete: seenAll } = await pageLayers(runtime.port, page.id);

      complete &&= seenAll;

      for (const { node } of layers) {
        if (fromPluginNode(node, null).type === "ComponentInstanceNode" && isOf(node, component)) {
          instances.push({
            id: idOf(node),
            name: nameOf(node),
            page: page.path ?? "",
            component: typeof node["componentName"] === "string" ? node["componentName"] : null,
          });
        }
      }
    }

    return {
      instances,
      truncated: !complete,
    };
  },
  describe({ component }, { instances }) {
    return {
      subject: component,
      summary: countOf(instances.length, "instance"),
    };
  },
});
