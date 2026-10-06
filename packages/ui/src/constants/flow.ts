import { Bot, Frame, Sparkles } from "lucide-react";
import type { FlowNode } from "../types/toolkit.ts";

/** How far behind the first line's sheen the second one starts, so the light passes from Claude Code to the project. */
export const FLOW_SHEEN_DELAY_SECONDS = 0.5;

/** The soft light that sweeps along a live line. */
export const FLOW_SHEEN_STYLE = {
  background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--sw-accent) 70%, transparent), transparent)",
} as const;

/** The stops the plugin and the journal window draw, from Claude Code to this project. */
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
