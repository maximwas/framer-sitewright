import { useStore } from "zustand";
import { FEED_VIEW_OPTIONS } from "../constants/ui.ts";
import { feedViewStore } from "../store/feed-view-store.ts";
import { Segmented } from "../toolkit/Segmented.tsx";

/** All, changes, reads or skills: which part of the journal the page shows. */
export function ViewSwitch() {
  const view = useStore(feedViewStore, (state) => state.view);
  const setView = useStore(feedViewStore, (state) => state.setView);

  return <Segmented label="Journal view" options={FEED_VIEW_OPTIONS} value={view} onChange={setView} />;
}
