import { expect, it, vi } from "vitest";
import { HistoryRecorder } from "../src/history/recorder.ts";
import { cmsCollectionCreate, cmsCollectionsList } from "../src/operations/cms/collections.ts";
import { cmsFieldsSet } from "../src/operations/cms/fields.ts";
import { cmsItemsDelete, cmsItemsList, cmsItemsUpsert } from "../src/operations/cms/items.ts";
import { runOperation } from "../src/operations/define.ts";
import { historyRevert } from "../src/operations/history/revert.ts";
import { createFakeRuntime } from "../src/testing/index.ts";
import { normalizeSlug } from "../src/utils/cms.ts";

function pluginRuntime() {
  return createFakeRuntime(
    {},
    {
      transport: "plugin",
      withAgent: false,
    },
  );
}

it("gives a new collection a string Title first, which Framer names items and builds slugs from", async () => {
  const { runtime } = pluginRuntime();

  const plain = await runOperation(
    cmsCollectionCreate,
    { runtime },
    {
      name: "Journal",
      fields: [
        {
          name: "Excerpt",
          type: "string",
        },
      ],
    },
  );

  expect(plain.fields.map(({ name, type }) => `${name}: ${type}`)).toEqual(["Title: string", "Excerpt: string"]);

  // A title the call names itself goes first instead of a second one.
  const named = await runOperation(
    cmsCollectionCreate,
    { runtime },
    {
      name: "People",
      fields: [
        {
          name: "Portrait",
          type: "image",
        },
        {
          name: "Name",
          type: "string",
        },
      ],
    },
  );

  expect(named.fields.map(({ name }) => name)).toEqual(["Name", "Portrait"]);
});

it("creates List fields with nested fields, writes them by nested field name and reads them back in full", async () => {
  const { runtime, state } = pluginRuntime();
  const run = { runtime };

  await runOperation(cmsCollectionCreate, run, {
    name: "Glazes",
    fields: [
      {
        name: "Gallery",
        type: "array",
        fields: [
          {
            name: "Image",
            type: "image",
          },
        ],
      },
    ],
  });

  const fields = await runOperation(cmsFieldsSet, run, {
    collection: "Glazes",
    add: [
      {
        name: "Tests",
        type: "array",
        fields: [
          {
            name: "Recipe",
            type: "string",
          },
          {
            name: "Colour",
            type: "color",
          },
          {
            name: "Tile",
            type: "image",
          },
        ],
      },
    ],
  });

  expect(fields.added).toEqual(["Tests"]);

  // The collection lists a List's nested fields, with ids for bindings on the canvas.
  const [summary] = (await runOperation(cmsCollectionsList, run, { collection: "Glazes" })).collections;
  const tests = summary?.fields.find(({ name }) => name === "Tests");

  expect(tests?.type).toBe("array");
  expect(tests?.id).toEqual(expect.any(String));
  expect(tests?.fields?.map(({ name, type }) => `${name}: ${type}`)).toEqual([
    "Recipe: string",
    "Colour: color",
    "Tile: image",
  ]);

  await runOperation(cmsItemsUpsert, run, {
    collection: "Glazes",
    items: [
      {
        slug: "celadon",
        values: {
          Title: "Celadon",
          // A one-field List (a Gallery) also takes bare values: image URLs, or { url, alt }.
          Gallery: [
            "https://framerusercontent.com/images/a.png",
            {
              url: "https://framerusercontent.com/images/b.png",
              alt: "B",
            },
          ],
          Tests: [
            {
              recipe: "Ash celadon 3",
              Colour: "#7FA394",
              Tile: "https://framerusercontent.com/images/t.png",
            },
            { Recipe: "Ash celadon 4" },
          ],
        },
      },
    ],
  });

  // Framer takes a List as its entries, each with values by nested field id.
  const glazes = state.collections.find(({ name }) => name === "Glazes");
  const testsField = glazes?.fields.find(({ name }) => name === "Tests");
  const recipe = testsField?.fields?.find(({ name }) => name === "Recipe");
  const stored = glazes?.items[0]?.fieldData[testsField?.id ?? ""];

  expect(stored).toMatchObject({
    type: "array",
    value: [{ fieldData: { [recipe?.id ?? ""]: { value: "Ash celadon 3" } } }, expect.anything()],
  });

  const [item] = (await runOperation(cmsItemsList, run, { collection: "Glazes" })).items;

  expect(item?.values).toEqual({
    Title: "Celadon",
    Gallery: [
      { Image: { url: "https://framerusercontent.com/images/a.png" } },
      {
        Image: {
          url: "https://framerusercontent.com/images/b.png",
          alt: "B",
        },
      },
    ],
    Tests: [
      {
        Recipe: "Ash celadon 3",
        Colour: "#7FA394",
        Tile: { url: "https://framerusercontent.com/images/t.png" },
      },
      { Recipe: "Ash celadon 4" },
    ],
  });

  // What cms_items_list reads, cms_items_upsert writes back unchanged.
  const update = new HistoryRecorder();

  await runOperation(
    cmsItemsUpsert,
    {
      runtime,
      history: update,
    },
    {
      collection: "Glazes",
      items: [
        {
          slug: "celadon",
          values: {
            ...item?.values,
            Gallery: [],
          },
        },
      ],
    },
  );

  const after = (await runOperation(cmsItemsList, run, { collection: "Glazes" })).items[0];

  expect(after?.values.Gallery).toEqual([]);
  expect(after?.values.Tests).toEqual(item?.values.Tests);

  // Undo puts the List back.
  await runOperation(historyRevert, run, { steps: [...update.steps] });

  expect((await runOperation(cmsItemsList, run, { collection: "Glazes" })).items[0]?.values.Gallery).toEqual(
    item?.values.Gallery,
  );

  // A name the List has not got is refused with the names it has.
  await expect(
    runOperation(cmsItemsUpsert, run, {
      collection: "Glazes",
      items: [
        {
          slug: "celadon",
          values: { Tests: [{ Glaze: "Shino" }] },
        },
      ],
    }),
  ).rejects.toThrow(/Recipe, Colour, Tile/);
});

it("renames a field without losing its values, and adds, renames, removes and orders enum cases", async () => {
  const { runtime, state } = pluginRuntime();
  const run = { runtime };

  await runOperation(cmsCollectionCreate, run, {
    name: "Posts",
    fields: [
      {
        name: "Subtitle",
        type: "string",
      },
      {
        name: "Kind",
        type: "enum",
        cases: ["Essay", "Field note", "Interview"],
      },
    ],
  });
  await runOperation(cmsItemsUpsert, run, {
    collection: "Posts",
    items: [
      {
        slug: "a",
        values: {
          Subtitle: "Kept",
          Kind: "Field note",
        },
      },
    ],
  });

  const kindId = state.collections[0]?.fields.find(({ name }) => name === "Kind")?.id;
  const result = await runOperation(cmsFieldsSet, run, {
    collection: "Posts",
    update: [
      {
        field: "subtitle",
        name: "Dek",
      },
      {
        field: "Kind",
        addCases: ["Podcast", "essay"],
        renameCases: { "Field note": "Field Note" },
        removeCases: ["Interview"],
        caseOrder: ["Podcast"],
      },
    ],
  });

  expect(result.updated).toEqual(["Dek", "Kind"]);
  expect(result.fields.find(({ name }) => name === "Kind")?.cases).toEqual(["Podcast", "Essay", "Field Note"]);
  // A rename keeps the field, so its id and every binding on the canvas stay.
  expect(result.fields.find(({ name }) => name === "Kind")?.id).toBe(kindId);

  const [item] = (await runOperation(cmsItemsList, run, { collection: "Posts" })).items;

  expect(item?.values).toMatchObject({
    Dek: "Kept",
    Kind: "Field Note",
  });

  // A rename onto another field's name is refused before anything changes.
  await expect(
    runOperation(cmsFieldsSet, run, {
      collection: "Posts",
      update: [
        {
          field: "Dek",
          name: "kind",
        },
      ],
    }),
  ).rejects.toThrow(/already has a field named Kind/);
  await expect(
    runOperation(cmsFieldsSet, run, {
      collection: "Posts",
      update: [
        {
          field: "Kind",
          removeCases: ["Review"],
        },
      ],
    }),
  ).rejects.toThrow(/Podcast, Essay, Field Note/);
  expect(state.collections[0]?.fields.map(({ name }) => name)).toEqual(["Title", "Dek", "Kind"]);
});

it("matches slugs as Framer stores them, refuses one slug twice in a batch, and answers with item ids", async () => {
  const { runtime, state } = pluginRuntime();
  const run = { runtime };

  await runOperation(cmsCollectionCreate, run, {
    name: "Authors",
    fields: [],
  });
  await runOperation(cmsCollectionCreate, run, {
    name: "Posts",
    fields: [
      {
        name: "Author",
        type: "collectionReference",
        collection: "Authors",
      },
    ],
  });

  const author = await runOperation(cmsItemsUpsert, run, {
    collection: "Authors",
    items: [
      {
        slug: "Ines Marlow",
        values: { Title: "Ines Marlow" },
      },
    ],
  });

  // Framer keeps the slug lowercased and hyphenated; the answer says what it kept, with the id.
  expect(author.created).toEqual([
    {
      id: state.collections[0]?.items[0]?.id,
      slug: "ines-marlow",
    },
  ]);

  const created = await runOperation(cmsItemsUpsert, run, {
    collection: "Posts",
    items: [
      {
        slug: "Lab Spaced Slug!",
        values: { Author: "Ines Marlow" },
      },
    ],
  });
  const again = await runOperation(cmsItemsUpsert, run, {
    collection: "Posts",
    items: [
      {
        slug: "Lab Spaced Slug!",
        values: { Title: "Again" },
      },
    ],
  });

  expect(again.updated).toEqual(created.created);
  expect(state.collections[1]?.items.map(({ slug }) => slug)).toEqual(["lab-spaced-slug"]);

  await expect(
    runOperation(cmsItemsUpsert, run, {
      collection: "Posts",
      items: [{ slug: "Twice" }, { slug: "twice" }],
    }),
  ).rejects.toThrow(/twice/);

  const deleted = await runOperation(cmsItemsDelete, run, {
    collection: "Posts",
    slugs: ["Lab Spaced Slug!"],
  });

  expect(deleted.deleted.map(({ id }) => id)).toEqual(created.created.map(({ id }) => id));
});

it("normalizes a slug the way Framer kept it on the sandbox (06.10.2026)", () => {
  const kept: Record<string, string> = {
    "Lab Spaced Slug!": "lab-spaced-slug",
    "Hello, World": "hello-world",
    "a  b": "a-b",
    "x/y": "x-y",
    "x&y": "x-y",
    "x.y": "x.y",
    "a__b--c": "a__b--c",
    "--lead": "lead",
    "trail-": "trail",
    A_B: "a_b",
    "Ça va?": "ça-va",
    "Café Olé": "café-olé",
    "Привіт світ": "привіт-світ",
    "日本語 テスト": "日本語-テスト",
    "100% Done": "100-done",
    "it's": "it-s",
    "tab\there": "tab-here",
    "emoji 🎉 ok": "emoji-🎉-ok",
  };

  expect(Object.fromEntries(Object.keys(kept).map((slug) => [slug, normalizeSlug(slug)]))).toEqual(kept);
});

it("refuses to remove a field layers are bound to and names their pages; force removes it anyway", async () => {
  const { runtime, state } = createFakeRuntime();
  const run = { runtime };
  const journal = await runOperation(cmsCollectionCreate, run, {
    name: "Journal",
    fields: [
      {
        name: "Subtitle",
        type: "string",
      },
      {
        name: "Unused",
        type: "string",
      },
    ],
  });
  const subtitle = journal.fields.find(({ name }) => name === "Subtitle")?.id ?? "";

  state.webPages.push({
    id: "page-detail",
    path: "/journal/:slug",
    draft: false,
    collectionId: journal.id,
  });
  state.serializedNodes["page-detail"] = {
    type: "WebPageNode",
    id: "page-detail",
    children: [
      {
        type: "FrameNode",
        id: "desktop",
        children: [
          {
            type: "RichTextNode",
            id: "dek",
            name: "Dek",
            attributes: { text: `var(--variable-${subtitle})` },
          },
        ],
      },
    ],
  };
  state.serializedNodes["page-home"] = {
    type: "WebPageNode",
    id: "page-home",
    children: [
      {
        type: "FrameNode",
        id: "list",
        name: "Latest",
        attributes: { collectionList: { filters: [{ variableId: subtitle }] } },
      },
    ],
  };

  const serialize = vi.spyOn(runtime.agent ?? { serialize: async () => null }, "serialize");

  await expect(
    runOperation(cmsFieldsSet, run, {
      collection: "Journal",
      remove: ["Subtitle", "Unused"],
    }),
  ).rejects.toThrow("Layers are bound to Subtitle on / (1 layer), /journal/:slug (1 layer).");
  expect(state.collections[0]?.fields.map(({ name }) => name)).toEqual(["Title", "Subtitle", "Unused"]);
  // The DSL knows a detail page by its collection's name, not by :slug.
  expect(serialize).toHaveBeenCalledWith(expect.objectContaining({ id: "page-detail" }), {
    pagePath: "/journal/:Journal",
  });

  const forced = await runOperation(cmsFieldsSet, run, {
    collection: "Journal",
    remove: ["Subtitle", "Unused"],
    force: true,
  });

  expect(forced.removed).toEqual(["Subtitle", "Unused"]);
  expect(forced.boundLayers).toEqual([
    {
      field: "Subtitle",
      pages: [
        {
          path: "/",
          layers: [
            {
              id: "list",
              name: "Latest",
            },
          ],
        },
        {
          path: "/journal/:slug",
          layers: [
            {
              id: "dek",
              name: "Dek",
            },
          ],
        },
      ],
    },
  ]);
});

it("says when it could not look for bound layers before removing a field", async () => {
  const { runtime } = pluginRuntime();

  await runOperation(
    cmsCollectionCreate,
    { runtime },
    {
      name: "Journal",
      fields: [
        {
          name: "Subtitle",
          type: "string",
        },
      ],
    },
  );

  const removed = await runOperation(
    cmsFieldsSet,
    { runtime },
    {
      collection: "Journal",
      remove: ["Subtitle"],
    },
  );

  expect(removed.removed).toEqual(["Subtitle"]);
  expect(removed.note).toMatch(/Server API key/);
});
