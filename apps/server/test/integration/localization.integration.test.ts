import { localesList, localizationGet, localizationSet } from "@sitewright/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TransportRouter } from "../../src/transports/router.ts";
import { createIntegrationTransports, integrationConfig } from "./helpers.ts";

const config = integrationConfig();

describe.skipIf(config === null)("localization on the sandbox project", () => {
  let transports: TransportRouter;

  beforeAll(async () => {
    if (config !== null) {
      transports = await createIntegrationTransports(config);
    }
  });

  afterAll(async () => {
    await transports.close();
  });

  it("reads the locales and texts, and writes a translation back as it was", async () => {
    const { locales } = await transports.run(localesList, {});
    const primary = locales.find((locale) => locale.default);

    expect(primary).toBeDefined();

    const other = locales.find((locale) => !locale.default);

    // A sandbox without a second locale can only be read (locale_add adds one, for good: no API removes it).
    if (other === undefined) {
      const read = await transports.run(localizationGet, {
        locale: primary?.code ?? "",
        limit: 5,
      });

      expect(read.total).toBeGreaterThanOrEqual(read.sources.length);

      return;
    }

    const [source] = (
      await transports.run(localizationGet, {
        locale: other.code,
        type: "page",
        limit: 1,
      })
    ).sources;

    expect(source).toBeDefined();

    if (source === undefined) {
      return;
    }

    const written = await transports.run(localizationSet, {
      locale: other.code,
      translations: [
        {
          id: source.id,
          value: "mcp-test translation",
        },
      ],
    });

    try {
      expect(written).toMatchObject({
        written: 1,
        errors: [],
      });

      const after = await transports.run(localizationGet, {
        locale: other.code,
        group: source.group,
        limit: 500,
      });

      // A formattedText source keeps its markup: Framer stores the text as <p dir="auto">…</p>.
      expect(after.sources.find(({ id }) => id === source.id)?.translation).toContain("mcp-test translation");
    } finally {
      await transports.run(localizationSet, {
        locale: other.code,
        translations: written.previous,
      });
    }
  });
});
