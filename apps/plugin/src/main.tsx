import "./styles.css";
import { BRIDGE_WINDOW_NAME } from "@sitewright/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { JOURNAL_WINDOW_FEATURES } from "./constants/ui.ts";
import { isAllowedTo, pluginRuntime, readPluginInfo, revealOnRequest, showPluginWindow } from "./framer/plugin.ts";
import { runInPlugin } from "./link/run-in-plugin.ts";
import { WindowLink } from "./link/window-link.ts";

// The link lives outside React: StrictMode mounts effects twice, and the link must outlive re-renders.
const link = new WindowLink({
  handle: (op, input, options) => runInPlugin(pluginRuntime, isAllowedTo, op, input, options),
  pluginInfo: readPluginInfo,
  openWindow: (url) => window.open(url, BRIDGE_WINDOW_NAME, JOURNAL_WINDOW_FEATURES),
});

link.onEvent(revealOnRequest);

// The font library takes over 30 s through the plugin: load it in the background once, so font searches find it ready.
void runInPlugin(pluginRuntime, isAllowedTo, "fonts.search", { query: "serif" }, { journal: false }).catch(
  () => undefined,
);

const root = document.getElementById("root");

if (root === null) {
  throw new Error("Missing #root in index.html");
}

createRoot(root).render(
  <StrictMode>
    <App link={link} />
  </StrictMode>,
);

showPluginWindow();
