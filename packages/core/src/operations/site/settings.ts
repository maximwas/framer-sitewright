import * as z from "zod";
import { SETTINGS_NO_KEY_NOTE, SETTINGS_NODE_TYPES, SETTINGS_PAGE_PATH } from "../../constants/site-settings.ts";
import { applyDsl, assetRefusal } from "../../dsl/apply-changes.ts";
import { joinCommands } from "../../dsl/commands.ts";
import { OperationError } from "../../errors.ts";
import { requireAgent } from "../../framer/runtime.ts";
import { withDslHistory } from "../../history/dsl/dsl-history.ts";
import { serializedList } from "../../history/dsl/serialized.ts";
import {
  LayoutTemplateSchema,
  PageSettingsInputSchema,
  PageSettingsSchema,
  SiteMetadataSchema,
  SiteSettingsInputSchema,
  SiteSettingsSetResultSchema,
} from "../../schemas/site-settings.ts";
import type { AgentPort } from "../../types/framer.ts";
import type { WebPageData } from "../../types/framer-port.ts";
import type { PageSettings, SettingsNodes } from "../../types/site-settings.ts";
import { settingsCommands, settingsOf } from "../../utils/site-settings.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { pagesToSearch } from "../nodes/find.ts";

/**
 * The site's metadata (the root node) and each page's own: title, description, images, search visibility, layout
 * template and draft state. The DSL reads them, so they need the Server API key; the Plugin API alone sees each page's
 * path and draft state.
 */
export const siteSettingsGet = defineOperation({
  name: "site.settings.get",
  effect: "read",
  idempotent: true,
  permissions: [],
  // With a key the read goes to the Server API for the metadata; without one the plugin still lists the pages.
  needsAgent: true,
  input: z.strictObject({
    pagePath: z.string().startsWith("/").exactOptional().describe("One page; omit for every web page."),
  }),
  output: z.object({
    /** Null without a Server API key, which the read needs. */
    site: SiteMetadataSchema.nullable(),
    pages: z.array(PageSettingsSchema),
    /** The layout templates a page can take, by id. */
    layoutTemplates: z.array(LayoutTemplateSchema),
    note: z.string().nullable(),
  }),
  async run({ runtime }, { pagePath }) {
    const pages = await pagesToSearch(runtime.port, pagePath);

    if (runtime.agent === null) {
      return {
        site: null,
        pages: pages.map((page) => pageSettingsOf(page, null)),
        layoutTemplates: [],
        note: SETTINGS_NO_KEY_NOTE,
      };
    }

    const settings = await readSettings(runtime.agent);

    return {
      site: settings.site,
      pages: pages.map((page) => pageSettingsOf(page, settings)),
      layoutTemplates: [...settings.layoutTemplates],
      note: null,
    };
  },
  describe({ pagePath }, { pages }) {
    return {
      subject: pagePath ?? null,
      summary: countOf(pages.length, "page"),
    };
  },
});

/**
 * Changes the site's and pages' settings in one DSL batch on the home page, journaled so undo restores each value.
 * Framer downloads an image URL itself; when it cannot, it sets everything else and the call reports that image.
 */
export const siteSettingsSet = defineOperation({
  name: "site.settings.set",
  effect: "write",
  idempotent: true,
  permissions: [],
  needsAgent: true,
  input: z
    .strictObject({
      site: SiteSettingsInputSchema.exactOptional().describe(
        "The site's defaults, which pages inherit; favicons live only here. null clears a value.",
      ),
      pages: z
        .array(PageSettingsInputSchema)
        .min(1)
        .max(100)
        .exactOptional()
        .describe("Pages by path, each with only the settings to change. null clears a value."),
    })
    .refine(({ site, pages }) => site !== undefined || pages !== undefined, "Give site, pages or both."),
  output: SiteSettingsSetResultSchema,
  async run({ runtime, history }, { site, pages = [] }) {
    const agent = requireAgent(runtime);
    const known = new Map(
      (await runtime.port.getNodesWithType("WebPageNode")).flatMap((page) =>
        page.path === null ? [] : [[page.path, page] as const],
      ),
    );
    const targets = pages.map((page) => {
      const found = known.get(page.path);

      if (found === undefined) {
        throw new OperationError(
          "NOT_FOUND",
          `No web page with path "${page.path}".`,
          "Call site_settings_get to list the pages.",
        );
      }

      return {
        ...page,
        id: found.id,
      };
    });
    const dsl = joinCommands(settingsCommands(site, targets));
    const apply = () => applyDsl(agent, dsl, SETTINGS_PAGE_PATH);
    const result = await (history === undefined
      ? apply()
      : withDslHistory(
          {
            history,
            agent,
            pagePath: SETTINGS_PAGE_PATH,
            dsl,
          },
          apply,
        )
    ).catch(assetRefusal);
    // The batch has run: a failed read only loses the settings the answer shows.
    const after = await readSettings(agent).catch(() => null);
    const changed = new Set(targets.map(({ id }) => id));

    return {
      ok: result.ok,
      message: result.message,
      errors: result.errors,
      site: after?.site ?? null,
      pages:
        after === null
          ? []
          : [...known.values()].filter(({ id }) => changed.has(id)).map((page) => pageSettingsOf(page, after)),
    };
  },
  refused(output) {
    return output.ok ? null : output.message;
  },
  describe({ site, pages = [] }) {
    return {
      subject: [...(site === undefined ? [] : ["site"]), ...pages.map(({ path }) => path)].join(", "),
    };
  },
});

/** The root, every web page and the layout templates, in one call. */
async function readSettings(agent: AgentPort): Promise<SettingsNodes> {
  return settingsOf(serializedList(await agent.getNodesOfTypes({ types: SETTINGS_NODE_TYPES })));
}

/** A page as the Plugin API lists it, with what the DSL read says about it; without that read, its path and draft. */
function pageSettingsOf(page: WebPageData, settings: SettingsNodes | null): PageSettings {
  const own = settings?.pages.get(page.id);

  return {
    path: page.path ?? "",
    id: page.id,
    draft: own?.draft ?? page.draft,
    collectionId: page.collectionId,
    metadata: own?.metadata ?? null,
    layoutTemplate: own?.layoutTemplate ?? null,
  };
}
