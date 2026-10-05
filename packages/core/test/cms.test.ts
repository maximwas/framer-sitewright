import { expect, it } from "vitest";
import { OperationError } from "../src/errors.ts";
import { cmsCollectionCreate } from "../src/operations/cms/collections.ts";
import { cmsItemsDelete, cmsItemsList, cmsItemsOrder, cmsItemsUpsert } from "../src/operations/cms/items.ts";
import { runOperation } from "../src/operations/define.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

it("writes CMS items by slug with values by field name, and reads them back in the same shape", async () => {
  const { runtime, state } = createFakeRuntime(
    {},
    {
      transport: "plugin",
      withAgent: false,
    },
  );
  const run = { runtime };

  await runOperation(cmsCollectionCreate, run, {
    name: "Authors",
    fields: [
      {
        name: "Name",
        type: "string",
      },
    ],
  });
  await runOperation(cmsItemsUpsert, run, {
    collection: "authors",
    items: [
      {
        slug: "ann",
        values: { Name: "Ann" },
      },
    ],
  });
  await runOperation(cmsCollectionCreate, run, {
    name: "Posts",
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
        name: "Cover",
        type: "image",
      },
      {
        name: "Author",
        type: "collectionReference",
        collection: "Authors",
      },
    ],
  });

  const first = await runOperation(cmsItemsUpsert, run, {
    collection: "Posts",
    items: [
      {
        slug: "hello",
        values: {
          title: "Hello",
          Body: "# Hi",
          Kind: "guide",
          Cover: {
            url: "https://framerusercontent.com/images/a.png",
            alt: "A",
          },
          Author: "ann",
        },
      },
      {
        slug: "second",
        draft: true,
        values: { Title: "Second" },
      },
    ],
  });

  expect(first).toMatchObject({
    created: ["hello", "second"],
    updated: [],
  });

  const posts = state.collections.find(({ name }) => name === "Posts");
  const kind = posts?.fields.find(({ name }) => name === "Kind");
  const stored = posts?.items.find(({ slug }) => slug === "hello")?.fieldData;

  // Framer takes values by field id: an enum by its case id, a reference by the item id, rich text as markdown or HTML.
  expect(Object.values(stored ?? {})).toEqual(
    expect.arrayContaining([
      {
        type: "enum",
        value: kind?.cases?.[1]?.id,
      },
      {
        type: "formattedText",
        value: "# Hi",
        contentType: "auto",
      },
      {
        type: "collectionReference",
        value: state.collections[0]?.items[0]?.id,
      },
    ]),
  );

  // The same slug again updates the item instead of adding another.
  const second = await runOperation(cmsItemsUpsert, run, {
    collection: "Posts",
    items: [
      {
        slug: "hello",
        values: { Title: "Hello again" },
      },
    ],
  });

  expect(second).toMatchObject({
    created: [],
    updated: ["hello"],
  });

  await runOperation(cmsItemsOrder, run, {
    collection: "Posts",
    slugs: ["second"],
  });

  const listed = await runOperation(cmsItemsList, run, { collection: "Posts" });

  expect(listed.items.map(({ slug }) => slug)).toEqual(["second", "hello"]);
  expect(listed.items[1]).toEqual({
    slug: "hello",
    draft: false,
    values: {
      Title: "Hello again",
      Body: "# Hi",
      Kind: "Guide",
      Cover: {
        url: "https://framerusercontent.com/images/a.png",
        alt: "A",
      },
      Author: "ann",
    },
  });

  // A deleted item comes back in the result, ready to write again.
  const deleted = await runOperation(cmsItemsDelete, run, {
    collection: "Posts",
    slugs: ["second", "missing"],
  });

  expect(deleted).toMatchObject({
    missing: ["missing"],
    deleted: [
      {
        slug: "second",
        values: { Title: "Second" },
      },
    ],
  });
  expect(posts?.items.map(({ slug }) => slug)).toEqual(["hello"]);
});

it("refuses a value its field cannot take and names what it can", async () => {
  const { runtime } = createFakeRuntime(
    {},
    {
      transport: "plugin",
      withAgent: false,
    },
  );

  await runOperation(
    cmsCollectionCreate,
    { runtime },
    {
      name: "Posts",
      fields: [
        {
          name: "Kind",
          type: "enum",
          cases: ["News", "Guide"],
        },
      ],
    },
  );

  const write = runOperation(
    cmsItemsUpsert,
    { runtime },
    {
      collection: "Posts",
      items: [
        {
          slug: "a",
          values: { Kind: "Review" },
        },
      ],
    },
  );

  await expect(write).rejects.toBeInstanceOf(OperationError);
  await expect(write).rejects.toThrow(/News, Guide/);
});
