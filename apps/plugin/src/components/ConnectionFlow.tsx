import { FLOW_COMET_STYLE, FLOW_NODES, FLOW_STEP_SECONDS } from "../constants/ui.ts";
import type { ConnectionFlowProps } from "../types/ui.ts";

/**
 * Claude Code → Sitewright → this project. While connected, a request runs as a glowing streak along each line in
 * turn, and a ring opens on the tile it reaches; otherwise the lines are dashed and still. CSS animations: a re-render
 * (the status, every second) never restarts them.
 */
export function ConnectionFlow({ live }: ConnectionFlowProps) {
  return (
    <div className="flex items-center rounded-xl border border-sw-line bg-sw-surface-2/50 px-3 py-3.5">
      {FLOW_NODES.map(({ label, icon: Icon, main }, index) => (
        <div key={label} className={`flex items-center ${index === 0 ? "" : "flex-1"}`}>
          {index > 0 && (
            <div className="relative mx-2 h-0.5 flex-1">
              <span
                className={`absolute inset-0 rounded-full ${live ? "bg-sw-accent/15" : "border-sw-line-strong border-t border-dashed"}`}
              />
              {live && (
                <span
                  aria-hidden
                  className="absolute inset-y-0 w-8 animate-sw-comet rounded-full"
                  style={{
                    ...FLOW_COMET_STYLE,
                    animationDelay: `${(index - 1) * FLOW_STEP_SECONDS}s`,
                  }}
                />
              )}
            </div>
          )}
          <div className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
            <span
              className={`relative grid size-9 place-items-center rounded-[10px] transition-shadow duration-500 ${
                main
                  ? `bg-sw-accent text-white ${live ? "shadow-[0_0_0_4px_var(--sw-accent-soft),0_6px_18px_-6px_var(--sw-accent)]" : ""}`
                  : "bg-sw-surface text-sw-ink-2 ring-1 ring-sw-line"
              }`}
            >
              {live && index > 0 && (
                <span
                  aria-hidden
                  className="absolute inset-0 animate-sw-arrive rounded-[10px] ring-2 ring-sw-accent"
                  style={{ animationDelay: `${index * FLOW_STEP_SECONDS}s` }}
                />
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
