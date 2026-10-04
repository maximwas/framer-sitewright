import type { McpSettings, ProjectKeyStatus } from "@sitewright/core";

export interface SettingsState {
  /** null until the server answers. */
  readonly settings: McpSettings | null;
  readonly busy: boolean;
  readonly toggle: (key: keyof McpSettings) => Promise<void>;
}

export interface ProjectKeyState {
  /** null until the server answers. */
  readonly status: ProjectKeyStatus | null;
  readonly busy: boolean;
  /** Resolves with whether the key was saved. */
  readonly save: (key: string, url: string | undefined) => Promise<boolean>;
  readonly remove: () => Promise<void>;
}
