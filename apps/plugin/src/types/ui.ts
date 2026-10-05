import type { Tone } from "@sitewright/ui";
import type { LucideIcon } from "lucide-react";
import type { WindowLink } from "../link/window-link.ts";
import type { LinkStatus } from "./link.ts";

/** What the plugin window says about the link. */
export interface StatusCopy {
  readonly title: string;
  readonly detail: string;
  /** `ok` while Claude Code can reach the project, `neutral` otherwise. */
  readonly tone: Tone;
}

/** One step of the setup guide: a command to copy, and what it does. */
export interface SetupStep {
  readonly title: string;
  readonly note: string;
  readonly command: string;
}

export interface AppProps {
  readonly link: WindowLink;
}

export interface SetupGuideProps {
  /** Unfolded at first while the plugin is not connected. */
  readonly initiallyOpen: boolean;
}

export interface StatusNoteProps {
  readonly state: LinkStatus["state"];
  readonly detail: string;
}

export interface ConnectionFlowProps {
  /** Claude Code reaches the project: requests run along the lines. */
  readonly live: boolean;
}

/** One stop on the way from Claude Code to the project. */
export interface FlowNode {
  readonly label: string;
  readonly icon: LucideIcon;
  /** Sitewright itself, in the middle. */
  readonly main: boolean;
}
