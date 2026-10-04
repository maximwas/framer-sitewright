import { ActivityPanel, SupportLinks, useActivityFeed } from "@sitewright/ui";
import { useStore } from "zustand";
import { AppHeader } from "./components/AppHeader.tsx";
import { Toasts } from "./components/Toasts.tsx";
import type { AppProps } from "./types/web.ts";

export function App({ client }: AppProps) {
  const connection = useStore(client.connection, ({ state }) => state);
  const feed = useActivityFeed();

  return (
    <main className="relative mx-auto flex h-full max-w-2xl flex-col gap-3 px-4 pt-4 pb-4">
      <AppHeader connection={connection} feed={feed} />
      <ActivityPanel feed={feed} />
      <SupportLinks />
      <Toasts />
    </main>
  );
}
