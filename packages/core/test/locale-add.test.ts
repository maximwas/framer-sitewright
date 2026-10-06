import { expect, it } from "vitest";
import { HistoryRecorder } from "../src/history/recorder.ts";
import { needsAgent, runOperation } from "../src/operations/define.ts";
import { localeAdd } from "../src/operations/localization/localization.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

it("adds a regional locale as a draft by default, with its fallback, through the Server API", async () => {
  const { runtime, state } = createFakeRuntime();
  const history = new HistoryRecorder();

  expect(needsAgent(localeAdd, { language: "nl" })).toBe(true);

  const added = await runOperation(
    localeAdd,
    {
      runtime,
      history,
    },
    {
      language: "Dutch",
      region: "Belgium",
      fallback: "en-US",
    },
  );

  expect(added).toMatchObject({
    code: "nl-BE",
    draft: true,
    fallback: "en-US",
  });
  expect(state.localeCreates).toEqual([
    {
      language: "nl",
      region: "BE",
      fallbackLocaleId: "default",
      draft: true,
    },
  ]);
  expect(state.locales.map(({ code }) => code)).toEqual(["nl-BE"]);
  expect(history.incomplete).toMatch(/Undo does not remove a locale/);
});

it("lists the languages Framer knows when the language is wrong, and refuses a locale the site has", async () => {
  const { runtime, state } = createFakeRuntime();

  await expect(runOperation(localeAdd, { runtime }, { language: "Klingon" })).rejects.toThrow(/nl \(Dutch\)/);
  await expect(
    runOperation(
      localeAdd,
      { runtime },
      {
        language: "nl",
        region: "FR",
      },
    ),
  ).rejects.toThrow(/BE \(Belgium\)/);
  await expect(
    runOperation(
      localeAdd,
      { runtime },
      {
        language: "en",
        region: "US",
      },
    ),
  ).rejects.toThrow(/already/);
  expect(state.localeCreates).toEqual([]);
});

it("needs the Server API: the plugin has no createLocale", async () => {
  const { runtime } = createFakeRuntime(
    {},
    {
      withAgent: false,
      transport: "plugin",
    },
  );
  const { createLocale: _, ...withoutCreate } = runtime.port;

  await expect(
    runOperation(
      localeAdd,
      {
        runtime: {
          ...runtime,
          port: withoutCreate,
        },
      },
      { language: "nl" },
    ),
  ).rejects.toThrow(/Server API key/);
});
