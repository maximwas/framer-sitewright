import { FLOW_NODES } from "../constants/ui.ts";
import type { ConnectionFlowProps } from "../types/ui.ts";

/**
 * Claude Code → Sitewright → this project, as on the site: while connected, requests run along the lines; otherwise
 * the lines are dashed and still. The runs are CSS animations, which a re-render (the status, every second) never
 * restarts.
 */
export function ConnectionFlow({ live }: ConnectionFlowProps) {
  return (
    <div className="flex items-center rounded-xl border border-sw-line bg-sw-surface-2/50 px-3 py-3">
      {FLOW_NODES.map(({ label, icon: Icon, main }, index) => (
        <div key={label} className={`flex items-center ${index === 0 ? "" : "flex-1"}`}>
          {index > 0 && (
            <div className="relative mx-1.5 h-px flex-1">
              <span
                className={`absolute inset-0 border-t ${live ? "border-sw-accent/40" : "border-sw-line-strong border-dashed"}`}
              />
              {live && (
                <span
                  aria-hidden
                  className="absolute top-[-2.5px] left-0 size-1.5 animate-sw-run rounded-full bg-sw-accent"
                  style={{ animationDelay: `${index * 0.7}s` }}
                />
              )}
            </div>
          )}
          <div className="flex w-[64px] shrink-0 flex-col items-center gap-1">
            <span
              className={`grid size-8 place-items-center rounded-lg ${main ? "bg-sw-accent text-white" : "bg-sw-surface text-sw-ink-2 ring-1 ring-sw-line"}`}
            >
              <Icon aria-hidden className="size-4" />
            </span>
            <span className="truncate text-[10.5px] text-sw-ink-3">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
