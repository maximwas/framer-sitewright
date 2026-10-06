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
        {
          name: "Steps",
          type: "array",
          fields: [
            {
              name: "Label",
              type: "string",
            },
            {
              name: "Minutes",
              type: "number",
            },
          ],
        },
      ],
      update: [
        {
          field: "Body",
          name: "Text",
        },
        {
          field: "Kind",
          addCases: ["Review"],
          renameCases: { News: "Update" },
          caseOrder: ["Review"],
        },
      ],
      remove: ["Views"],
      order: ["Kind"],
    });

    expect(fields.fields.map(({ name }) => name)).toEqual(
      expect.arrayContaining(["Title", "Text", "Kind", "Featured", "Author", "Steps"]),
    );
    expect(fields.fields.map(({ name }) => name)).not.toContain("Views");
    expect(fields.fields.find(({ name }) => name === "Kind")?.cases).toEqual(["Review", "Update", "Guide"]);
    expect(fields.fields.find(({ name }) => name === "Steps")?.fields?.map(({ name }) => name)).toEqual([
      "Label",
      "Minutes",
    ]);

    const written = await transports.run(cmsItemsUpsert, {
      collection: posts,
      items: [
        {
          slug: "hello",
          values: {
            Title: "Hello",
            Text: "**Bold** start",
            Kind: "Guide",
            Author: "ann",
            Featured: true,
            Steps: [
              {
                Label: "Mix",
                Minutes: 5,
              },
              { Label: "Rest" },
            ],
          },
        },
        {
          slug: "Second Post!",
          draft: true,
          values: {
            Title: "Second",
            Kind: "Update",
          },
        },
      ],
    });

    // Framer keeps the slug lower case and hyphenated; the same slug again finds that item.
    expect(written.created.map(({ slug }) => slug)).toEqual(["hello", "second-post"]);
    expect(written.updated).toEqual([]);
    expect(
      (
        await transports.run(cmsItemsUpsert, {
          collection: posts,
          items: [
            {
              slug: "Second Post!",
              values: { Title: "Second" },
            },
          ],
        })
      ).updated,
    ).toEqual([written.created[1]]);

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
      updated: [written.created[0]],
    });

    // Undo through the journal puts the title back; redo (the undo of the undo) brings the new one again.
    const redo = new HistoryRecorder();

    await transports.run(historyRevert, { steps: [...update.steps] }, { history: redo });
    expect(await titleOf(transports, posts, "hello")).toBe("Hello");
    await transports.run(historyRevert, { steps: [...redo.steps] });
    expect(await titleOf(transports, posts, "hello")).toBe("Hello again");

    await transports.run(cmsItemsOrder, {
      collection: posts,
      slugs: ["second-post"],
    });

    const listed = await transports.run(cmsItemsList, { collection: posts });
    const hello = listed.items.find(({ slug }) => slug === "hello");

    expect(listed.items.map(({ slug }) => slug)).toEqual(["second-post", "hello"]);
    expect(hello?.id).toBe(written.created[0]?.id);
    expect(hello?.values).toMatchObject({
      Title: "Hello again",
      Kind: "Guide",
      Author: "ann",
      Featured: true,
    });
    expect(hello?.values.Steps).toMatchObject([
      {
        Label: "Mix",
        Minutes: 5,
      },
      { Label: "Rest" },
    ]);
    // Framer keeps rich text as HTML, whatever it was written as; the renamed field kept it.
    expect(String(hello?.values.Text)).toContain("<strong>Bold</strong>");

    const deleted = await transports.run(cmsItemsDelete, {
      collection: posts,
      slugs: ["Second Post!"],
    });

    expect(deleted.deleted.map(({ slug }) => slug)).toEqual(["second-post"]);
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
