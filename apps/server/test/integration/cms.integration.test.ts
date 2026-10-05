import {
  cmsCollectionCreate,
  cmsCollectionDelete,
  cmsCollectionsList,
  cmsFieldsSet,
  cmsItemsDelete,
  cmsItemsList,
  cmsItemsOrder,
  cmsItemsUpsert,
  HistoryRecorder,
  historyRevert,
} from "@sitewright/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TransportRouter } from "../../src/transports/router.ts";
import { createIntegrationTransports, integrationConfig, TEST_PREFIX } from "./helpers.ts";

const config = integrationConfig();

describe.skipIf(config === null)("CMS on the sandbox project", () => {
  let transports: TransportRouter;

  beforeAll(async () => {
    if (config !== null) {
      transports = await createIntegrationTransports(config);
    }
  });

  afterAll(async () => {
    await removeTestCollections(transports);
    await transports.close();
  });

  it("creates a collection, writes items by slug, reads them back, orders and deletes them", async () => {
    await removeTestCollections(transports);

    const authors = `${TEST_PREFIX} Authors`;
    const posts = `${TEST_PREFIX} Posts`;

    await transports.run(cmsCollectionCreate, {
      name: authors,
      fields: [
        {
          name: "Name",
          type: "string",
        },
      ],
    });
    await transports.run(cmsItemsUpsert, {
      collection: authors,
      items: [
        {
          slug: "ann",
          values: { Name: "Ann" },
        },
      ],
    });
    await transports.run(cmsCollectionCreate, {
      name: posts,
      fields: [
        {
          name: "Title",
          type: "string",
        },
        {
          name: "Body",
          type: "formattedText",
        },
        {
          name: "Kind",
          type: "enum",
          cases: ["News", "Guide"],
        },
        {
          name: "Views",
          type: "number",
        },
        {
          name: "Author",
          type: "collectionReference",
          collection: authors,
        },
      ],
    });

    const fields = await transports.run(cmsFieldsSet, {
      collection: posts,
      add: [
        {
          name: "Featured",
          type: "boolean",
        },
      ],
      remove: ["Views"],
      order: ["Kind"],
    });

    expect(fields.fields.map(({ name }) => name)).toEqual(expect.arrayContaining(["Kind", "Featured", "Author"]));
    expect(fields.fields.map(({ name }) => name)).not.toContain("Views");

    const written = await transports.run(cmsItemsUpsert, {
      collection: posts,
      items: [
        {
          slug: "hello",
          values: {
            Title: "Hello",
            Body: "**Bold** start",
            Kind: "Guide",
            Author: "ann",
            Featured: true,
          },
        },
        {
          slug: "second",
          draft: true,
          values: {
            Title: "Second",
            Kind: "News",
          },
        },
      ],
    });

    expect(written).toMatchObject({
      created: ["hello", "second"],
      updated: [],
    });

    const update = new HistoryRecorder();
    const again = await transports.run(
      cmsItemsUpsert,
      {
        collection: posts,
        items: [
          {
            slug: "hello",
            values: { Title: "Hello again" },
          },
        ],
      },
      { history: update },
    );

    expect(again).toMatchObject({
      created: [],
      updated: ["hello"],
    });

    // Undo through the journal puts the title back; redo (the undo of the undo) brings the new one again.
    const redo = new HistoryRecorder();

    await transports.run(historyRevert, { steps: [...update.steps] }, { history: redo });
    expect(await titleOf(transports, posts, "hello")).toBe("Hello");
    await transports.run(historyRevert, { steps: [...redo.steps] });
    expect(await titleOf(transports, posts, "hello")).toBe("Hello again");

    await transports.run(cmsItemsOrder, {
      collection: posts,
      slugs: ["second"],
    });

    const listed = await transports.run(cmsItemsList, { collection: posts });
    const hello = listed.items.find(({ slug }) => slug === "hello");

    expect(listed.items.map(({ slug }) => slug)).toEqual(["second", "hello"]);
    expect(hello?.values).toMatchObject({
      Title: "Hello again",
      Kind: "Guide",
      Author: "ann",
      Featured: true,
    });
    // Framer keeps rich text as HTML, whatever it was written as.
    expect(String(hello?.values.Body)).toContain("<strong>Bold</strong>");

    const deleted = await transports.run(cmsItemsDelete, {
      collection: posts,
      slugs: ["second"],
    });

    expect(deleted.deleted.map(({ slug }) => slug)).toEqual(["second"]);
    expect((await transports.run(cmsItemsList, { collection: posts })).total).toBe(1);

    // The Plugin API cannot remove a collection; the DSL removes it as the CollectionNode it is there.
    const removed = await transports.run(cmsCollectionDelete, { collection: posts });

    expect(removed.deletedItems.map(({ slug }) => slug)).toEqual(["hello"]);
    expect((await transports.run(cmsCollectionsList, {})).collections.map(({ name }) => name)).not.toContain(posts);
  });
});

async function removeTestCollections(transports: TransportRouter): Promise<void> {
  const { collections } = await transports.run(cmsCollectionsList, {});

  for (const { name } of collections.filter((collection) => collection.name.startsWith(TEST_PREFIX))) {
    await transports.run(cmsCollectionDelete, { collection: name });
  }
}

async function titleOf(transports: TransportRouter, collection: string, slug: string): Promise<unknown> {
  const { items } = await transports.run(cmsItemsList, { collection });

  return items.find((item) => item.slug === slug)?.values.Title;
}
