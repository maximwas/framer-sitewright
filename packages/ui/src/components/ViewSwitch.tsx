import { ACTIVITY_VIEWS } from "@sitewright/core";
import { useStore } from "zustand";
import { BADGE_TEXT, FEED_VIEW_LABELS } from "../constants/ui.ts";
import { feedViewStore } from "../store/feed-view-store.ts";

/** All, changes, reads or skills: which part of the journal the page shows. */
export function ViewSwitch() {
  const view = useStore(feedViewStore, (state) => state.view);
  const setView = useStore(feedViewStore, (state) => state.setView);

  return (
    <div className="flex gap-0.5 rounded-lg bg-framer-bg-secondary p-0.5">
      {ACTIVITY_VIEWS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={view === option}
          title={FEED_VIEW_LABELS[option].title}
          className={`h-6 min-w-0 flex-1 truncate rounded-md px-2 font-medium text-[11px] ${
            view === option
              ? "bg-framer-bg text-framer-text shadow-sm"
              : "bg-transparent text-framer-text-secondary hover:text-framer-text"
          }`}
          onClick={() => setView(option)}
        >
          <span className={BADGE_TEXT}>{FEED_VIEW_LABELS[option].label}</span>
        </button>
      ))}
    </div>
  );
}
