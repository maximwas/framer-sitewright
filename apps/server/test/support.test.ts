import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { createLogger } from "../src/logging/logger.ts";
import { SettingsStore } from "../src/settings/settings-store.ts";
import { SupportReminder } from "../src/support/support-reminder.ts";

const links = [
  {
    label: "Patreon",
    url: "https://www.patreon.com/example",
  },
];
const DAY = 24 * 60 * 60 * 1000;

it("mentions support at most once a week, only while the user allows it, and never without links", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sitewright-support-"));
  const settings = new SettingsStore(join(dir, "settings.json"), createLogger("silent"));
  let now = Date.parse("2026-10-04T10:00:00.000Z");
  const reminder = (options: { enabled?: boolean; withLinks?: boolean } = {}) =>
    new SupportReminder({
      file: join(dir, "support.json"),
      enabled: options.enabled ?? true,
      settings,
      links: options.withLinks === false ? [] : links,
      now: () => now,
    });

  expect(await reminder({ withLinks: false }).due()).toBeNull();
  expect(await reminder({ enabled: false }).due()).toBeNull();
  expect(await reminder().due()).toContain("https://www.patreon.com/example");
  // Another session on the same machine shares the file: no second mention this week.
  now += 6 * DAY;
  expect(await reminder().due()).toBeNull();
  now += 2 * DAY;
  await settings.set({ supportReminders: false });
  expect(await reminder().due()).toBeNull();
  await settings.set({ supportReminders: true });
  expect(await reminder().due()).toContain("Patreon");
});
