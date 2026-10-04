import { SETTING_ITEMS } from "@sitewright/core";
import { ROW_BUTTON } from "../constants/ui.ts";
import { useSettings } from "../hooks/useSettings.ts";
import type { SettingsPanelProps } from "../types/props.ts";
import { ServerApiKey } from "./ServerApiKey.tsx";
import { SettingToggle } from "./SettingToggle.tsx";

/** What the agent may do in this project: the switches every Claude Code session follows. */
export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, busy, toggle } = useSettings();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2.5">
      <div className="flex gap-2">
        <button type="button" className={ROW_BUTTON} onClick={onClose}>
          Back to journal
        </button>
      </div>
      <ServerApiKey />
      {settings === null ? (
        <p className="text-framer-text-tertiary">Loading settings…</p>
      ) : (
        <ul className="flex flex-col gap-2 overflow-y-auto">
          {SETTING_ITEMS.map(({ key, label, info }) => (
            <SettingToggle
              key={key}
              label={label}
              info={info}
              checked={settings[key]}
              disabled={busy}
              onToggle={() => void toggle(key)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
