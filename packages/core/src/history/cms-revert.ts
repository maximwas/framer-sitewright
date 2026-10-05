import { cmsItemState, cmsItemStep } from "../cms/item-state.ts";
import { CmsItemIndex } from "../cms/values.ts";
import type { FramerRuntime } from "../types/framer.ts";
import type { CmsFieldData, CmsFieldInput, CmsItemHandle, CollectionHandle } from "../types/framer-port.ts";
import type { CmsItemState, CmsItemStep, RevertOptions, RevertOutcome, WorkingEntry } from "../types/history.ts";
import { decide } from "./revert-decision.ts";

type CmsEntry = WorkingEntry<CmsItemState, CmsItemHandle>;

interface CollectionScope {
  readonly collection: CollectionHandle;
  readonly fields: readonly CmsFieldData[];
  readonly entries: CmsEntry[];
}

/**
 * Undoes CMS item steps through the Plugin API: restores an item's values, deletes an item the AI added, adds back one
 * it deleted. Each collection is read once per revert; the revert records its own steps, so redo undoes it.
 */
export class CmsItemRevert {
  readonly #runtime: FramerRuntime;
  readonly #options: RevertOptions;
  readonly #remap: Map<string, string>;
  readonly #scopes = new Map<string, Promise<CollectionScope | null>>();

  constructor(runtime: FramerRuntime, options: RevertOptions, remap: Map<string, string>) {
    this.#runtime = runtime;
    this.#options = options;
    this.#remap = remap;
  }

  async revert(step: CmsItemStep): Promise<RevertOutcome> {
    const collectionId = (step.before ?? step.after)?.collectionId;
    const scope = collectionId === undefined ? null : await this.#scope(collectionId);

    if (scope === null) {
      return "gone";
    }

    const decision = decide(step, scope.entries, this.#options.force);
    const { collection } = scope;
    const dryRun = this.#options.dryRun;

    if (decision.outcome === "deleted") {
      const { target } = decision;

      if (!dryRun) {
        await collection.removeItems([target.id]);
        this.#options.history?.record(cmsItemStep(target.id, target.state, null));
      }

      scope.entries.splice(scope.entries.indexOf(target), 1);
    } else if (decision.outcome === "restored" && step.before !== null) {
      const { target } = decision;
      const state = step.before;

      if (!dryRun) {
        await collection.addItems([
          {
            id: target.id,
            slug: state.slug,
            draft: state.draft,
            fieldData: fieldDataOf(state),
          },
        ]);
        this.#options.history?.record(cmsItemStep(target.id, target.state, state));
      }

      target.state = state;
    } else if (decision.outcome === "recreated" && step.before !== null) {
      const state = step.before;
      let id = `dry-run:${step.id}`;

      if (!dryRun) {
        await collection.addItems([
          {
            slug: state.slug,
            draft: state.draft,
            fieldData: fieldDataOf(state),
          },
        ]);

        // addItems answers nothing: the new item is found by its slug.
        const added = (await collection.getItems()).find((item) => item.slug === state.slug);

        id = added?.id ?? id;
        this.#options.history?.record(cmsItemStep(id, null, state));
        this.#options.history?.recordRemap(step.id, id);
      }

      this.#remap.set(step.id, id);
      scope.entries.push({
        id,
        path: state.path,
        state,
        handle: null,
      });
    }

    return decision.outcome;
  }

  #scope(collectionId: string): Promise<CollectionScope | null> {
    let scope = this.#scopes.get(collectionId);

    if (scope === undefined) {
      scope = this.#read(collectionId);
      this.#scopes.set(collectionId, scope);
    }

    return scope;
  }

  async #read(collectionId: string): Promise<CollectionScope | null> {
    const collections = await this.#runtime.port.getCollections();
    const collection = collections.find(({ id }) => id === collectionId);

    if (collection === undefined) {
      return null;
    }

    const [fields, items] = await Promise.all([collection.getFields(), collection.getItems()]);
    const index = new CmsItemIndex(collections);

    return {
      collection,
      fields,
      entries: await Promise.all(
        items.map(async (item) => {
          const state = await cmsItemState(collection, fields, item, index);

          return {
            id: item.id,
            path: state.path,
            state,
            handle: item,
          };
        }),
      ),
    };
  }
}

/** The state's values as addItems takes them; cmsItemState only keeps values in that shape. */
function fieldDataOf(state: CmsItemState): Record<string, CmsFieldInput> {
  return state.fieldData as Record<string, CmsFieldInput>;
}
