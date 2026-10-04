import type * as z from "zod";
import type { McpSettingsPatchSchema, McpSettingsSchema } from "../schemas/settings.ts";

export type McpSettings = z.infer<typeof McpSettingsSchema>;

export type McpSettingsPatch = z.infer<typeof McpSettingsPatchSchema>;

/** One switch as people see it: its name and what it gives. */
export interface SettingItem {
  readonly key: keyof McpSettings;
  readonly label: string;
  readonly info: string;
}
