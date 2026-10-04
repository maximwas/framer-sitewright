import type { SupportLink } from "@sitewright/core";
import type { SettingsStore } from "../settings/settings-store.ts";

export interface SupportReminderOptions {
  /** support.json, shared by every session on the machine. */
  readonly file: string;
  /** SITEWRIGHT_SUPPORT_REMINDERS: off turns the mentions off for good. */
  readonly enabled: boolean;
  readonly settings: SettingsStore;
  readonly links: readonly SupportLink[];
  readonly now?: () => number;
}
