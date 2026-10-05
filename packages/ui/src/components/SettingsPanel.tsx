import { SETTING_ITEMS } from "@sitewright/core";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { EASE_OUT } from "../constants/toolkit.ts";
import { useSettings } from "../hooks/useSettings.ts";
import { Button } from "../toolkit/Button.tsx";
import { Spinner } from "../toolkit/Spinner.tsx";
import type { SettingsPanelProps } from "../types/props.ts";
import { ServerApiKey } from "./ServerApiKey.tsx";
import { SettingToggle } from "./SettingToggle.tsx";

/** What the agent may do in this project: the switches every Claude Code session follows, and the project's key. */
export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, busy, toggle } = useSettings();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pt-3 pb-3">
      <div className="flex items-center gap-2">
        <Button icon={ArrowLeft} variant="ghost" onClick={onClose}>
          Journal
        </Button>
        <h2 className="font-semibold text-[13px] text-sw-ink">Settings</h2>
      </div>
      <ServerApiKey />
      {settings === null ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {SETTING_ITEMS.map(({ key, label, info }, index) => (
            <motion.li
              key={key}
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.35,
                ease: EASE_OUT,
                delay: index * 0.05,
              }}
            >
              <SettingToggle
                label={label}
                info={info}
                checked={settings[key]}
                disabled={busy}
                onToggle={() => void toggle(key)}
              />
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
