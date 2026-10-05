import type { WindowBarProps } from "../types/toolkit.ts";
import { LogoMark } from "./LogoMark.tsx";

/** The bar along a window's top: the mark, what the window is and for which project, and its status on the right. */
export function WindowBar({ title, subtitle = null, children }: WindowBarProps) {
  return (
    <header className="flex min-w-0 items-center gap-2.5 border-sw-line border-b bg-sw-surface-2/70 px-3.5 py-2.5">
      <LogoMark />
      <h1 className="min-w-0 truncate text-[13px] text-sw-ink-3">
        <strong className="font-semibold text-sw-ink">{title}</strong>
        {subtitle !== null && <span> · {subtitle}</span>}
      </h1>
      <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div>
    </header>
  );
}
