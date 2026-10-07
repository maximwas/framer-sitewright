import * as z from "zod";
import { CMS_ITEMS_PAGE_MAX, CMS_UPSERT_MAX } from "../../constants/cms.ts";
import {
  INTERLINK_TOP,
  INTERLINK_TOP_MAX,
  SEO_BLOG_FIELDS,
  SEO_CATEGORIES,
  SEO_CATEGORY_FIELD,
  SEO_KEYWORD_FIELD,
  SEO_RELATED_FIELD,
  SEO_TAGS_FIELD,
} from "../../constants/cms-seo.ts";
import { relatedItems } from "../../utils/interlink.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { cmsCollectionCreate } from "./collections.ts";
import { cmsFieldsSet } from "./fields.ts";
import { cmsItemsList, cmsItemsUpsert } from "./items.ts";

export const cmsSeoCollection = defineOperation({
  name: "cms.seoCollection",
  effect: "write",
  idempotent: true,
  permissions: ["createCollection", "Collection.addFields"],
  needsAgent: true,
  input: z.strictObject({
    name: z.string().min(1).default("Blog").describe("The collection; an existing one gets the fields it lacks."),
    categories: z
      .array(z.string().min(1))
      .min(1)
      .default([...SEO_CATEGORIES])
      .describe("The Category options."),
  }),
  output: z.object({
    collection: z.string(),
    created: z.boolean(),
    added: z.array(z.string()),
  }),
  async run(context, { name, categories }) {
    const fields = [
      ...SEO_BLOG_FIELDS.map((field) => ({ ...field })),
      {
        name: SEO_CATEGORY_FIELD,
        type: "enum" as const,
        cases: categories,
      },
    ];
    const existing = (await context.runtime.port.getCollections()).find(
      (collection) => collection.name.toLowerCase() === name.trim().toLowerCase(),
    );

    if (existing === undefined) {
      await cmsCollectionCreate.run(context, {
        name,
        fields,
      });
    }

    // The related posts point at the collection itself, so the field comes once the collection exists.
    const extended = await cmsFieldsSet.run(context, {
      collection: name,
      add: [
        ...(existing === undefined ? [] : fields),
        {
          name: SEO_RELATED_FIELD,
          type: "multiCollectionReference",
          collection: name,
        },
      ],
      update: [],
      remove: [],
      force: false,
      order: [],
    });

    return {
      collection: name,
      created: existing === undefined,
      added: existing === undefined ? [...fields.map((field) => field.name), SEO_RELATED_FIELD] : extended.added,
    };
  },
  describe({ name }, { created, added }) {
    return {
      subject: name,
      summary: created ? `Created with ${countOf(added.length, "field")}` : `${countOf(added.length, "field")} added`,
    };
  },
});

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export const cmsInterlink = defineOperation({
  name: "cms.interlink",
  effect: "write",
  idempotent: true,
  permissions: ["Collection.addItems"],
  needsAgent: true,
  input: z.strictObject({
    collection: z
      .string()
      .min(1)
      .describe("Collection name or id; it needs a Related field (cms_seo_collection adds one)."),
    top: z.number().int().min(1).max(INTERLINK_TOP_MAX).default(INTERLINK_TOP).describe("Related items per item."),
    dryRun: z.boolean().default(false),
  }),
  output: z.object({
    collection: z.string(),
    related: z.record(z.string(), z.array(z.string())),
    written: z.number().int(),
  }),
  async run(context, { collection, top, dryRun }) {
    const listed = await cmsItemsList.run(context, {
      collection,
      offset: 0,
      limit: CMS_ITEMS_PAGE_MAX,
    });
    const items = listed.items.map(({ slug, values }) => ({
      slug,
      category: stringValue(values[SEO_CATEGORY_FIELD]),
      tags: (stringValue(values[SEO_TAGS_FIELD]) ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      keyword: stringValue(values[SEO_KEYWORD_FIELD]),
    }));
    const related = relatedItems(items, top);

    const writes = [...related].map(([slug, slugs]) => ({
      slug,
      values: { [SEO_RELATED_FIELD]: slugs },
    }));

    // One upsert takes CMS_UPSERT_MAX items at most.
    for (let start = 0; !dryRun && start < writes.length; start += CMS_UPSERT_MAX) {
      await cmsItemsUpsert.run(context, {
        collection,
        items: writes.slice(start, start + CMS_UPSERT_MAX),
      });
    }

    return {
      collection: listed.collection,
      related: Object.fromEntries(related),
      written: dryRun ? 0 : related.size,
    };
  },
  describe({ collection, dryRun }, { written, related }) {
    return {
      subject: collection,
      summary: dryRun
        ? `${countOf(Object.keys(related).length, "item")} (preview)`
        : `${countOf(written, "item")} linked`,
    };
  },
});
