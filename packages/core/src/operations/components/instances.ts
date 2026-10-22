import * as z from "zod";
import { serializedList } from "../../history/dsl/serialized.ts";
import { fromPluginNode } from "../../plugin-nodes/attributes.ts";
import { idOf, nameOf, nodeRecord } from "../../plugin-nodes/node-record.ts";
import { pageLayers } from "../../plugin-nodes/walk.ts";
import type { SerializedNode } from "../../types/dsl.ts";
import type { AgentPort, FramerRuntime } from "../../types/framer.ts";
import type { PluginNodeRecord } from "../../types/plugin-nodes.ts";
import type { SearchRoot } from "../../types/site.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { searchRoots } from "../nodes/find.ts";

const InstanceSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  page: z.string(),
  /** The breakpoint it is on: each breakpoint holds its own copy. */
  breakpoint: z.string().nullable(),
  component: z.string().nullable(),
  /** Its variant by name, as $control__variant sets it; null when it shows the primary or the read cannot tell. */
  variant: z.string().nullable(),
  /** The component this is an instance of, when the wanted one reaches the page inside it. */
  via: z.string().nullable(),
});

type Instance = z.output<typeof InstanceSchema>;

/** Whether an instance is of the wanted component: its id inside the identifier, or its name in any case. */
function isOf(node: PluginNodeRecord, wanted: string): boolean {
  const identifier = typeof node["componentIdentifier"] === "string" ? node["componentIdentifier"] : "";
  const name = typeof node["componentName"] === "string" ? node["componentName"] : "";

  return identifier.split(/[/:]/).includes(wanted) || name.toLowerCase() === wanted.toLowerCase();
}

/** The same for an instance as the DSL serializes it: `component` names the component by id. */
function isSerializedOf(node: SerializedNode, wanted: string, names: ReadonlyMap<string, string>): boolean {
  const component = componentOf(node);
  const name = names.get(component) ?? displayNameOf(node) ?? "";

  return (
    component === wanted || component.split(/[/:]/).includes(wanted) || name.toLowerCase() === wanted.toLowerCase()
  );
}

function componentOf(node: SerializedNode): string {
  const component: unknown = (node as Record<string, unknown>)["component"];

  return typeof component === "string" ? component : "";
}

function displayNameOf(node: SerializedNode): string | null {
  const name: unknown = (node as Record<string, unknown>)["$componentDisplayName"];

  return typeof name === "string" ? name : null;
}

export const componentInstances = defineOperation({
  name: "components.instances",
  effect: "read",
  idempotent: true,
  permissions: [],
  // The DSL names each instance's variant; the Plugin API does not.
  needsAgent: true,
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
    const pages = await searchRoots(runtime, pagePath);

    return runtime.agent === null
      ? pluginInstances(runtime, pages, component)
      : agentInstances(runtime, runtime.agent, pages, component);
  },
  describe({ component }, { instances }) {
    return {
      subject: component,
      summary: countOf(instances.length, "instance"),
    };
  },
});

/**
 * Through the DSL: every breakpoint's instances with their variant, and the instances of the components that hold the
 * wanted one, which bring it onto the page too.
 */
async function agentInstances(
  runtime: FramerRuntime,
  agent: AgentPort,
  pages: readonly SearchRoot[],
  wanted: string,
): Promise<{ instances: Instance[]; truncated: boolean }> {
  const components = serializedList(await agent.getNodesOfTypes({ types: ["ComponentNode"] }));
  // A component node's name keeps its folder ("Lab/Button"): every answer names components that way.
  const names = new Map(components.map((node) => [node.id, node.name ?? node.id]));
  const holders = new Map<string, string>();

  for (const holder of components) {
    const inside = serializedList(
      await agent.getDescendantsOfTypes({
        id: holder.id,
        types: ["ComponentInstanceNode"],
      }),
    );

    if (!isSerializedOf(holder, wanted, names) && inside.some((node) => isSerializedOf(node, wanted, names))) {
      holders.set(holder.id, holder.name ?? holder.id);
    }
  }

  const instances: Instance[] = [];

  for (const page of pages) {
    const path = page.path;
    // A layout template ("layout <name>") is read without a page path.
    const scope = path.startsWith("/") ? { pagePath: path } : {};
    const breakpoints = (await runtime.port.getChildren(page.id))
      .map(nodeRecord)
      .filter((node): node is PluginNodeRecord => Boolean(node?.isBreakpoint));
    const roots =
      breakpoints.length === 0
        ? [
            {
              id: page.id,
              name: null,
            },
          ]
        : breakpoints.map((node) => ({
            id: idOf(node),
            name: nameOf(node),
          }));

    for (const root of roots) {
      const found = serializedList(
        await agent.getDescendantsOfTypes(
          {
            id: root.id,
            types: ["ComponentInstanceNode"],
          },
          scope,
        ),
      );

      for (const node of found) {
        const direct = isSerializedOf(node, wanted, names);
        const via = direct ? null : (holders.get(componentOf(node)) ?? null);

        if (direct || via !== null) {
          const variant = node.attributes?.["$control__variant"];

          instances.push({
            id: node.id,
            name: node.name ?? null,
            page: path,
            breakpoint: root.name,
            component: names.get(componentOf(node)) ?? displayNameOf(node),
            variant: typeof variant === "string" ? variant : null,
            via,
          });
        }
      }
    }
  }

  return {
    instances,
    truncated: false,
  };
}

/** Without a Server API key: the Plugin API's walk, every breakpoint's copies included, without variants. */
async function pluginInstances(
  runtime: FramerRuntime,
  pages: readonly SearchRoot[],
  wanted: string,
): Promise<{ instances: Instance[]; truncated: boolean }> {
  const instances: Instance[] = [];
  let complete = true;

  for (const page of pages) {
    const { layers, complete: seenAll } = await pageLayers(runtime.port, page.id, { copies: true });

    complete &&= seenAll;

    for (const { node, breakpoint } of layers) {
      if (fromPluginNode(node, null).type === "ComponentInstanceNode" && isOf(node, wanted)) {
        instances.push({
          id: idOf(node),
          name: nameOf(node),
          page: page.path ?? "",
          breakpoint: breakpoint === null ? null : nameOf(breakpoint),
          component: typeof node["componentName"] === "string" ? node["componentName"] : null,
          variant: null,
          via: null,
        });
      }
    }
  }

  return {
    instances,
    truncated: !complete,
  };
}
