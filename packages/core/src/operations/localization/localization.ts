import * as z from "zod";
import {
  CANVAS_MODE_REFUSAL,
  LOCALIZATION_GROUP_TYPES,
  LOCALIZATION_PAGE,
  LOCALIZATION_PAGE_MAX,
  LOCALIZATION_SET_MAX,
  LOCALIZATION_UNDO_NOTE,
} from "../../constants/localization.ts";
import { OperationError } from "../../errors.ts";
import { findLocale, siteLocales } from "../../localization/locales.ts";
import { LocaleSummarySchema, LocalizedSourceSchema } from "../../schemas/localization.ts";
import type { FramerPort, LocalizedValueUpdate } from "../../types/framer-port.ts";
import { errorMessage } from "../../utils/errors.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

const LocaleInput = z.string().min(1).describe('Locale by code, name or id, e.g. "nl" or "Dutch".');

export const localesList = defineOperation({
  name: "localization.locales",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({}),
  output: z.object({ locales: z.array(LocaleSummarySchema) }),
  async run({ runtime }) {
    const { primary, locales } = await siteLocales(runtime.port);

    return {
      locales: locales.map(({ id, code, name, slug, fallbackLocaleId }) => {
        const fallback = locales.find((locale) => locale.id === fallbackLocaleId)?.code;

        return {
          id,
          code,
          name,
          slug,
          default: id === primary.id,
          ...(fallback === undefined ? {} : { fallback }),
        };
      }),
    };
  },
  describe(_input, { locales }) {
    return { summary: countOf(locales.length, "locale") };
  },
});

export const localizationGet = defineOperation({
  name: "localization.get",
  effect: "read",
  idempotent: true,
  permissions: [],
  // Through the Server API whenever the project has a key: Framer gives a plugin the translations only in its
  // Localization mode, and the Sitewright plugin runs on the canvas.
  needsAgent: true,
  input: z.strictObject({
    locale: LocaleInput,
    type: z.enum(LOCALIZATION_GROUP_TYPES).exactOptional().describe("Only pages, CMS items, components…"),
    group: z
      .string()
      .min(1)
      .exactOptional()
      .describe("Only the groups whose name contains this, e.g. a page path or a CMS item's title."),
    missing: z
      .boolean()
      .default(false)
      .describe("Only texts without a translation, in groups not excluded from the locale."),
    offset: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(LOCALIZATION_PAGE_MAX).default(LOCALIZATION_PAGE),
  }),
  output: z.object({
    locale: z.string(),
    total: z.number().int(),
    sources: z.array(LocalizedSourceSchema),
  }),
  async run({ runtime }, { locale: query, type, group, missing, offset, limit }) {
    const locale = findLocale((await siteLocales(runtime.port)).locales, query);
    const wanted = group?.toLowerCase();
    const groups = (await localizationGroups(runtime.port)).filter(
      (entry) =>
        (type === undefined || entry.type === type) &&
        (wanted === undefined || entry.name.toLowerCase().includes(wanted)) &&
        !(missing && entry.statusByLocale[locale.id] === "excluded"),
    );
    const sources = groups.flatMap((entry) =>
      entry.sources.map((source) => {
        const translated = source.valueByLocale[locale.id];

        return {
          id: source.id,
          group: entry.name,
          type: source.type,
          source: source.value,
          translation: translated?.value ?? null,
          status: translated?.status ?? null,
        };
      }),
    );
    const listed = missing ? sources.filter(({ translation }) => translation === null || translation === "") : sources;

    return {
      locale: locale.name,
      total: listed.length,
      sources: listed.slice(offset, offset + limit),
    };
  },
  describe(_input, { locale, sources, total }) {
    return {
      subject: locale,
      summary: sources.length === total ? countOf(total, "text") : `${sources.length} of ${countOf(total, "text")}`,
    };
  },
});

export const localizationSet = defineOperation({
  name: "localization.set",
  effect: "write",
  idempotent: true,
  permissions: ["setLocalizationData"],
  needsAgent: true,
  input: z.strictObject({
    locale: LocaleInput,
    translations: z
      .array(
        z.strictObject({
          id: z.string().min(1).describe("Source id from localization_get."),
          value: z.string().nullable().describe("The translation; null clears it, so the fallback shows."),
        }),
      )
      .max(LOCALIZATION_SET_MAX)
      .default([]),
    needsReview: z.boolean().default(false).describe("Mark the translations for the user to review."),
    groups: z
      .array(
        z.strictObject({
          group: z.string().min(1).describe("Group name or id, e.g. a page or CMS item."),
          status: z.enum(["ready", "excluded"]).describe("excluded keeps the group out of this locale."),
        }),
      )
      .default([]),
  }),
  output: z.object({
    locale: z.string(),
    written: z.number().int(),
    cleared: z.number().int(),
    /** What Framer refused, by source or group id. */
    errors: z.array(z.string()),
    /** The translations before the write, for putting them back. */
    previous: z.array(
      z.object({
        id: z.string(),
        value: z.string().nullable(),
      }),
    ),
  }),
  async run({ runtime, history }, { locale: query, translations, needsReview, groups }) {
    const { port } = runtime;
    const [{ primary, locales }, existing] = await Promise.all([siteLocales(port), localizationGroups(port)]);
    const locale = findLocale(locales, query);

    if (locale.id === primary.id) {
      throw new OperationError(
        "INVALID_INPUT",
        `${locale.name} is the default locale: its text is the source itself.`,
        "Change the text on the canvas (design_apply) or in the CMS item.",
      );
    }

    const sources = new Map(existing.flatMap((entry) => entry.sources).map((source) => [source.id, source]));
    const unknown = translations.filter(({ id }) => !sources.has(id)).map(({ id }) => id);

    if (unknown.length > 0) {
      throw new OperationError(
        "NOT_FOUND",
        `No localization source ${unknown.join(", ")}.`,
        "Take source ids from localization_get.",
      );
    }

    const valuesBySource = Object.fromEntries(
      translations.map(({ id, value }): [string, Record<string, LocalizedValueUpdate>] => [
        id,
        {
          [locale.id]:
            value === null
              ? { action: "clear" }
              : {
                  action: "set",
                  value,
                  ...(needsReview ? { needsReview } : {}),
                },
        },
      ]),
    );
    const statusByLocaleByGroup = Object.fromEntries(
      groups.map(({ group, status }) => {
        const found =
          existing.find(({ id }) => id === group) ??
          existing.find(({ name }) => name.toLowerCase() === group.toLowerCase());

        if (found === undefined) {
          throw new OperationError(
            "NOT_FOUND",
            `No localization group "${group}".`,
            "Take names from localization_get.",
          );
        }

        return [found.id, { [locale.id]: status }];
      }),
    );

    history?.markIncomplete(LOCALIZATION_UNDO_NOTE);

    const result = await port.setLocalizationData({
      valuesBySource,
      statusByLocaleByGroup,
    });
    const errors = [
      ...result.valuesBySource.errors.map(({ sourceId, error }) => `${sourceId}: ${error}`),
      ...result.statusByLocaleByGroup.errors.map(({ groupId, error }) => `${groupId}: ${error}`),
    ];
    const failed = new Set(result.valuesBySource.errors.map(({ sourceId }) => sourceId));
    const applied = translations.filter(({ id }) => !failed.has(id));

    return {
      locale: locale.name,
      written: applied.filter(({ value }) => value !== null).length,
      cleared: applied.filter(({ value }) => value === null).length,
      errors,
      previous: translations.map(({ id }) => ({
        id,
        value: sources.get(id)?.valueByLocale[locale.id]?.value ?? null,
      })),
    };
  },
  describe(_input, { locale, written, cleared }) {
    return {
      subject: locale,
      summary: [
        written > 0 ? `${countOf(written, "translation")} written` : null,
        cleared > 0 ? `${countOf(cleared, "translation")} cleared` : null,
      ]
        .filter((part) => part !== null)
        .join(", "),
    };
  },
  refused({ errors, written, cleared }) {
    return errors.length > 0 && written + cleared === 0 ? errors.join("; ") : null;
  },
});

/** The translation groups, with Framer's refusal on the canvas put in words the user can act on. */
async function localizationGroups(port: FramerPort) {
  try {
    return await port.getLocalizationGroups();
  } catch (error) {
    if (CANVAS_MODE_REFUSAL.test(errorMessage(error))) {
      throw new OperationError(
        "UNSUPPORTED_TRANSPORT",
        "Framer gives a plugin the translations only in its Localization mode, and the Sitewright plugin runs on the canvas.",
        "Add the project's Server API key (npx sitewright key): translations then go through the Server API.",
      );
    }

    throw error;
  }
}
