import type { UIOptions } from "@framer/plugin";
import { CloseCode } from "@sitewright/core";
import { Bot, Frame, Sparkles } from "lucide-react";
import type { LinkStatus } from "../types/link.ts";
import type { FlowNode, StatusCopy } from "../types/ui.ts";

/** The plugin's window: top right, out of the way of the canvas, wide enough for the setup commands. */
export const PLUGIN_WINDOW: UIOptions = {
  position: "top right",
  width: 400,
  height: 560,
  resizable: true,
  minWidth: 320,
  minHeight: 200,
  maxWidth: 560,
  maxHeight: 900,
};

/** The journal window: small, beside the editor. */
export const JOURNAL_WINDOW_FEATURES = "popup,width=440,height=760";

/** How often the plugin says hello to its journal window, and checks whether it was closed. */
export const HELLO_INTERVAL_MS = 1_000;

/** A window that has not answered a hello for this long is waited for again (reloading, or no server). */
export const WINDOW_SILENT_MS = 3_500;

/** The closest the canvas zooms when the journal opens a node: 1 is 100%. */
export const REVEAL_MAX_ZOOM = 1;

/** What a new text node holds until the batch sets its text: addText needs some. */
export const NEW_TEXT_PLACEHOLDER = "Text";

/** What the plugin says in each state; a stop is told by its close code (see STOP_COPY). */
export const STATUS_COPY: Readonly<Record<Exclude<LinkStatus["state"], "stopped">, StatusCopy>> = {
  "needs-window": {
    title: "Not connected",
    detail: "Connect opens the journal window, which carries the plugin's connection to Claude Code.",
    tone: "neutral",
  },
  waiting: {
    title: "Waiting for the window",
    detail:
      "Keep the journal window open. If it shows an error, the MCP server is not running: start Claude Code with it.",
    tone: "neutral",
  },
  connecting: {
    title: "Connecting…",
    detail: "The journal window is looking for the MCP server Claude Code runs.",
    tone: "neutral",
  },
  retrying: {
    title: "Waiting for Claude Code",
    detail: "The MCP server is not reachable: is Claude Code running? The window keeps trying.",
    tone: "neutral",
  },
  connected: {
    title: "Connected",
    detail: "Claude Code can edit this project while the plugin and the journal window stay open.",
    tone: "ok",
  },
};

/** A stop by close code: another Framer window took the bridge (4409), or the versions differ (4426). */
export const STOP_COPY: Readonly<Record<number, StatusCopy>> = {
  [CloseCode.Superseded]: {
    title: "Taken over",
    detail: "Another Framer window connected to Claude Code.",
    tone: "neutral",
  },
  [CloseCode.VersionMismatch]: {
    title: "Version mismatch",
    detail: "Update the plugin and the MCP server to the same version.",
    tone: "neutral",
  },
};

export const STOPPED_COPY: StatusCopy = {
  title: "Disconnected",
  detail: "The connection to Claude Code stopped.",
  tone: "neutral",
};

/** How far behind the first line's sheen the second one starts, so the light passes from Claude Code to the project. */
export const FLOW_SHEEN_DELAY_SECONDS = 0.5;

/** The soft light that sweeps along a live line. */
export const FLOW_SHEEN_STYLE = {
  background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--sw-accent) 70%, transparent), transparent)",
} as const;

/** The links the plugin's window draws, from Claude Code to this project. */

export const FLOW_NODES: readonly FlowNode[] = [
  {
    label: "Claude Code",
    icon: Bot,
    main: false,
  },
  {
    label: "Sitewright",
    icon: Sparkles,
    main: true,
  },
  {
    label: "This project",
    icon: Frame,
    main: false,
  },
];
