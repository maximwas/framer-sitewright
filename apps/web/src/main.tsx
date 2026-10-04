import "./styles.css";
import { WEB_SOCKET_PATH } from "@sitewright/core";
import { ActivityApiClient, ActivityApiProvider, EditorHostProvider } from "@sitewright/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { WebSocketClient } from "./api/web-socket-client.ts";
import { startPluginBridge } from "./bridge/start-plugin-bridge.ts";
import { createWebHost } from "./host/web-host.ts";
import { relayStore } from "./store/relay-store.ts";

const element = document.getElementById("root");

if (element === null) {
  throw new Error("Missing #root in index.html");
}

// The client lives outside React: StrictMode mounts effects twice, and the connection must outlive re-renders.
const client = new WebSocketClient(`ws://${location.host}${WEB_SOCKET_PATH}`);

client.start();
// This window holds the Framer plugin's session with the server; the plugin only runs the operations.
startPluginBridge().catch(() => relayStore.setState({ state: "closed" }));

createRoot(element).render(
  <StrictMode>
    <ActivityApiProvider client={new ActivityApiClient(client)}>
      <EditorHostProvider host={createWebHost(client)}>
        <App client={client} />
      </EditorHostProvider>
    </ActivityApiProvider>
  </StrictMode>,
);
