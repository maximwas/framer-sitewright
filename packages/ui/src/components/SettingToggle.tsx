import { useState } from "react";
import type { SettingToggleProps } from "../types/props.ts";

/** One switch: its name, an "!" that unfolds what it gives, and the switch itself. */
export function SettingToggle({ label, info, checked, disabled, onToggle }: SettingToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <li className="flex flex-col gap-1.5 rounded-lg bg-framer-bg-secondary p-2.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 font-semibold text-framer-text">{label}</span>
        <button
          type="button"
          aria-label={`What ${label} does`}
          aria-expanded={open}
          title={info}
          className="grid size-5 w-5 shrink-0 place-items-center rounded-full bg-amber-500/15 p-0 font-bold text-[11px] text-amber-700 dark:text-amber-300"
          onClick={() => setOpen(!open)}
        >
          !
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          disabled={disabled}
          className={`relative h-5 w-9 shrink-0 rounded-full p-0 transition-colors disabled:opacity-40 ${checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
          onClick={onToggle}
        >
          <span
            className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left] ${checked ? "left-[18px]" : "left-0.5"}`}
          />
        </button>
      </div>
      {open && <p className="text-framer-text-secondary">{info}</p>}
    </li>
  );
}
