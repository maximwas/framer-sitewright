import type { Tone } from "@sitewright/ui";
import type { WindowLink } from "../link/window-link.ts";

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
