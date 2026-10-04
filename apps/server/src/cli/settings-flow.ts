import { multiselect, note } from "@clack/prompts";
import { type McpSettings, SETTING_ITEMS } from "@sitewright/core";
import type { SettingsStore } from "../settings/settings-store.ts";
import { answered } from "./cancel.ts";

/** The switches as text: on or off, with what each one gives when `explain`. */
export function describeSettings(settings: McpSettings, explain = true): string {
  return SETTING_ITEMS.map(
    ({ key, label, info }) => `${settings[key] ? "on " : "off"}  ${label}${explain ? `: ${info}` : ""}`,
  ).join("\n");
}

/** Lets the person pick the switches that are on; every Claude Code session follows them. */
export async function chooseSettings(store: SettingsStore): Promise<McpSettings> {
  const current = await store.get();
  const on = answered(
    await multiselect({
      message: "What may the agent do? (space to switch, enter to save)",
      options: SETTING_ITEMS.map(({ key, label, info }) => ({
        value: key,
        label,
        hint: info,
      })),
      initialValues: SETTING_ITEMS.filter(({ key }) => current[key]).map(({ key }) => key),
      required: false,
    }),
  );
  const saved = await store.set(Object.fromEntries(SETTING_ITEMS.map(({ key }) => [key, on.includes(key)])));

  note(describeSettings(saved, false), "Saved");

  return saved;
}
