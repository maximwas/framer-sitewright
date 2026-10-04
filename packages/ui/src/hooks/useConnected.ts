import { useStore } from "zustand";
import { useActivityApi } from "./useActivityApi.ts";

/** Whether the server can be reached right now; the component re-renders when that changes. */
export function useConnected(): boolean {
  const { transport } = useActivityApi();

  return useStore(transport.connection, (connection) => connection.state === "connected");
}
