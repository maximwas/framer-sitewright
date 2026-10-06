import { CMS_BINDING_DEPTH, CMS_BINDING_LAYERS_MAX } from "../constants/cms.ts";
import { childrenOf, parseSerializedNode } from "../history/dsl/serialized.ts";
import type { CmsFieldBinding, CmsFieldBindingSearch } from "../types/cms.ts";
import type { SerializedNode } from "../types/dsl.ts";
import type { FramerRuntime } from "../types/framer.ts";
import type { CmsFieldData, CollectionHandle } from "../types/framer-port.ts";
import { dslPagePath, mentionsAnyId } from "../utils/cms.ts";

/**
 * The layers on every web page bound to the fields, read through the DSL (a List's nested fields count as the List's):
 * a text, an image or a link bound with var(--variable-<id>), a collection list filtered or sorted by the field. Null
 * without framer.agent: the Plugin API does not show bindings.
 */
export async function findFieldBindings(
  runtime: FramerRuntime,
  collections: readonly CollectionHandle[],
  fields: readonly CmsFieldData[],
): Promise<CmsFieldBindingSearch | null> {
  const { agent } = runtime;

  if (agent === null) {
    return null;
  }

  const pages =
    fields.length === 0
      ? []
      : (await runtime.port.getNodesWithType("WebPageNode")).filter(
          (page): page is typeof page & { path: string } => page.path !== null,
        );
  const layersByField = new Map<string, Map<string, { id: string; name: string | null }[]>>();
  const unread: string[] = [];

  for (const page of pages) {
    const collection = collections.find(({ id }) => id === page.collectionId)?.name ?? null;
    let tree: SerializedNode | null = null;

    try {
      tree = parseSerializedNode(
        await agent.serialize(
          {
            id: page.id,
            depth: CMS_BINDING_DEPTH,
          },
          { pagePath: dslPagePath(page.path, collection) },
        ),
      );
    } catch {
      // A page the DSL cannot read is named as unread below.
    }

    if (tree === null) {
      unread.push(page.path);
      continue;
    }

    const seen = new Set<string>();
    let complete = true;

    walk(tree, (node) => {
      complete &&= !(node.$truncated ?? false);

      // A breakpoint's copy of a layer is the same layer to the person who bound it.
      const key = node.$originalId ?? node.id;

      for (const field of fields) {
        const ids = [field.id, ...(field.fields ?? []).map(({ id }) => id)];

        if (!seen.has(`${field.id}:${key}`) && mentionsAnyId(node.attributes ?? {}, ids)) {
          seen.add(`${field.id}:${key}`);

          const byPage = layersByField.get(field.id) ?? new Map();
          const layers = byPage.get(page.path) ?? [];

          layers.push({
            id: node.id,
            name: node.name ?? null,
          });
          byPage.set(page.path, layers);
          layersByField.set(field.id, byPage);
        }
      }
    });

    if (!complete) {
      unread.push(page.path);
    }
  }

  return {
    bindings: fields.flatMap((field) => {
      const byPage = layersByField.get(field.id);

      return byPage === undefined ? [] : [bindingOf(field.name, byPage)];
    }),
    unread,
  };
}

function bindingOf(
  field: string,
  byPage: ReadonlyMap<string, readonly { id: string; name: string | null }[]>,
): CmsFieldBinding {
  return {
    field,
    pages: [...byPage].map(([path, layers]) => ({
      path,
      layers: layers.slice(0, CMS_BINDING_LAYERS_MAX),
      ...(layers.length > CMS_BINDING_LAYERS_MAX ? { more: layers.length - CMS_BINDING_LAYERS_MAX } : {}),
    })),
  };
}

function walk(node: SerializedNode, visit: (node: SerializedNode) => void): void {
  visit(node);

  for (const child of childrenOf(node)) {
    walk(child, visit);
  }
}
