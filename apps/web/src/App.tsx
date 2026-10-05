import { ActivityPanel, SupportLinks, Toaster, useActivityFeed } from "@sitewright/ui";
import { MotionConfig } from "motion/react";
import { useStore } from "zustand";
import { AppHeader } from "./components/AppHeader.tsx";
import type { AppProps } from "./types/web.ts";

/**
 * The journal window. In the small window Connect opens it fills the window; in a wide tab it sits in a card like the
 * site's, with a margin around it.
 */
export function App({ client }: AppProps) {
  const connection = useStore(client.connection, ({ state }) => state);
  const feed = useActivityFeed();

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex h-full justify-center sm:p-6">
        <div className="relative flex h-full min-h-0 w-full max-w-2xl flex-col overflow-hidden bg-sw-surface sm:rounded-2xl sm:border sm:border-sw-line-strong sm:shadow-sw">
          <AppHeader connection={connection} feed={feed} />
          <ActivityPanel feed={feed} />
          <div className="px-3.5 pb-2 empty:hidden">
            <SupportLinks />
          </div>
        </div>
      </main>
      <Toaster />
    </MotionConfig>
  );
}
