import { FLOW_NODES, FLOW_SHEEN_DELAY_SECONDS, FLOW_SHEEN_STYLE } from "../constants/ui.ts";
import type { ConnectionFlowProps } from "../types/ui.ts";

/**
 * Claude Code → Sitewright → this project. While connected, the lines are solid and a soft light sweeps along them in
 * turn, and a live dot breathes on Sitewright; otherwise the lines are dashed and still. CSS animations: a re-render
 * (the status, every second) never restarts them.
 */
export function ConnectionFlow({ live }: ConnectionFlowProps) {
  return (
    <div className="flex items-center rounded-xl border border-sw-line bg-sw-surface-2/50 px-3 py-3.5">
      {FLOW_NODES.map(({ label, icon: Icon, main }, index) => (
        <div key={label} className={`flex items-center ${index === 0 ? "" : "flex-1"}`}>
          {index > 0 && (
            <div className="relative mx-2 h-px flex-1 overflow-hidden">
              <span
                className={`absolute inset-0 transition-colors duration-500 ${
                  live ? "bg-sw-accent/35" : "border-sw-line-strong border-t border-dashed"
                }`}
              />
              {live && (
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-2/5 animate-sw-sheen"
                  style={{
                    ...FLOW_SHEEN_STYLE,
                    animationDelay: `${(index - 1) * FLOW_SHEEN_DELAY_SECONDS}s`,
                  }}
                />
              )}
            </div>
          )}
          <div className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
            <span
              className={`relative grid size-9 place-items-center rounded-[10px] transition-colors duration-500 ${
                main ? "bg-sw-accent text-white" : "bg-sw-surface text-sw-ink-2 ring-1 ring-sw-line"
              }`}
            >
              {main && live && (
                <span aria-hidden className="absolute -top-1 -right-1 size-2.5">
                  <span className="absolute inset-0 animate-sw-pulse rounded-full bg-sw-ok" />
                  <span className="absolute inset-0 rounded-full bg-sw-ok ring-2 ring-sw-surface" />
                </span>
              )}
              <Icon aria-hidden className="size-4" />
            </span>
            <span className="truncate font-medium text-[10.5px] text-sw-ink-3">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
