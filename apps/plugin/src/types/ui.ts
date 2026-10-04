import type { WindowLink } from "../link/window-link.ts";

/** `positive` while Claude Code can reach the project, `neutral` otherwise. */
export type StatusTone = "positive" | "neutral";

/** What the plugin window says about the link. */
export interface StatusCopy {
  readonly title: string;
  readonly detail: string;
  readonly tone: StatusTone;
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

export interface StatusBadgeProps {
  readonly title: string;
  readonly tone: StatusTone;
}

export interface SetupGuideProps {
  /** Unfolded until the plugin is connected. */
  readonly open: boolean;
}

export interface CopyCommandProps {
  readonly command: string;
}
