import { createStore } from "zustand/vanilla";
import type { RelayState } from "../types/web.ts";

/** Whether this window carries the Framer plugin's bridge; the header shows it. */
export const relayStore = createStore<RelayState>()(() => ({ state: "no-plugin" }));
