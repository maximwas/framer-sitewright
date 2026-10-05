import { Info } from "lucide-react";
import { useState } from "react";
import { Collapse } from "../toolkit/Collapse.tsx";
import { Switch } from "../toolkit/Switch.tsx";
import type { SettingToggleProps } from "../types/props.ts";

/** One switch: its name, an info button that unfolds what it gives, and the switch itself. */
export function SettingToggle({ label, info, checked, disabled, onToggle }: SettingToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col rounded-xl border border-sw-line bg-sw-surface px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 font-semibold text-[12.5px] text-sw-ink">{label}</span>
        <button
          type="button"
          aria-label={`What ${label} does`}
          aria-expanded={open}
          title={info}
          className={`grid size-6 w-6 shrink-0 place-items-center rounded-full border-0 p-0 transition-colors ${open ? "bg-sw-accent-soft text-sw-accent-ink" : "bg-transparent text-sw-ink-3 hover:text-sw-ink"}`}
          onClick={() => setOpen(!open)}
        >
          <Info aria-hidden className="size-3.5" />
        </button>
        <Switch checked={checked} disabled={disabled} label={label} onToggle={onToggle} />
      </div>
      <Collapse open={open}>
        <p className="pt-1.5 text-[12px] text-sw-ink-2">{info}</p>
      </Collapse>
    </div>
  );
}
