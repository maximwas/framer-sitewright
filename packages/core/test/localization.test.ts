import { expect, it } from "vitest";
import { runOperation } from "../src/operations/define.ts";
import { localesList, localizationGet, localizationSet } from "../src/operations/localization/localization.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

function fakeProject() {
  return createFakeRuntime(
    {
      defaultLocale: {
        id: "en",
        code: "en",
        name: "English",
        slug: "",
      },
      locales: [
        {
          id: "nl",
          code: "nl",
          name: "Dutch",
          slug: "nl",
          fallbackLocaleId: "en",
        },
      ],
      localizationGroups: [
        {
          id: "page-home",
          name: "Home",
          type: "page",
          statusByLocale: { nl: "ready" },
          sources: [
            {
              id: "s1",
              type: "string",
              value: "Hello",
              valueByLocale: {},
            },
            {
              id: "s2",
              type: "string",
              value: "World",
              valueByLocale: {
                nl: {
                  value: "Wereld",
                  status: "done",
                },
              },
            },
          ],
        },
        {
          id: "item-a",
          name: "Post A",
          type: "collection-item",
          statusByLocale: { nl: "excluded" },
          sources: [
            {
              id: "s3",
              type: "formattedText",
              value: "<p>Body</p>",
              valueByLocale: {},
            },
          ],
        },
      ],
    },
    {
      transport: "plugin",
      withAgent: false,
    },
  );
}

it("lists what still needs a translation and writes translations by source id", async () => {
  const { runtime, state } = fakeProject();

  const locales = await runOperation(localesList, { runtime }, {});

  expect(locales.locales.map(({ code, default: isDefault }) => [code, isDefault])).toEqual([
    ["en", true],
    ["nl", false],
  ]);

  // A group excluded from the locale needs nothing.
  const missing = await runOperation(
    localizationGet,
    { runtime },
    {
      locale: "nl",
      missing: true,
    },
  );

  expect(missing.sources).toEqual([
    {
      id: "s1",
      group: "Home",
      type: "string",
      source: "Hello",
      translation: null,
      status: null,
    },
  ]);

  const written = await runOperation(
    localizationSet,
    { runtime },
    {
      locale: "Dutch",
      translations: [
        {
          id: "s1",
          value: "Hallo",
        },
        {
          id: "s2",
          value: null,
        },
      ],
    },
  );

  expect(written).toMatchObject({
    written: 1,
    cleared: 1,
    errors: [],
    previous: [
      {
        id: "s1",
        value: null,
      },
      {
        id: "s2",
        value: "Wereld",
      },
    ],
  });
  expect(state.localizationGroups[0]?.sources.map(({ valueByLocale }) => valueByLocale.nl?.value ?? null)).toEqual([
    "Hallo",
    null,
  ]);
});

it("refuses to translate into the default locale, whose text is the source", async () => {
  const { runtime } = fakeProject();

  await expect(
    runOperation(
      localizationSet,
      { runtime },
      {
        locale: "en",
        translations: [
          {
            id: "s1",
            value: "Hi",
          },
        ],
      },
    ),
  ).rejects.toThrow(/default locale/);
});

it("lists the default locale in a project without added locales, as Framer leaves it out of getLocales", async () => {
  const { runtime } = createFakeRuntime(
    { locales: [] },
    {
      transport: "plugin",
      withAgent: false,
    },
  );

  const { locales } = await runOperation(localesList, { runtime }, {});

  expect(locales.map(({ code, default: isDefault }) => [code, isDefault])).toEqual([["en-US", true]]);
});
