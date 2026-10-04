import * as z from "zod";

/**
 * What the user allows the agent, from the switches on the Sitewright journal page. Every Claude Code session reads
 * the same file, so a switch applies to all of them.
 */
export const McpSettingsSchema = z.object({
  /** auto transport: the plugin runs everything it can while it is connected; off: the Server API first. */
  pluginFirst: z.boolean().default(true),
  /** custom_code_set may write the site's custom HTML. */
  customCode: z.boolean().default(false),
  /** code_file_write may create and change code components and overrides. */
  codeComponents: z.boolean().default(false),
  /** Claude may mention how to support the project, once a week at most, after a change. */
  supportReminders: z.boolean().default(true),
});

/** A settings change: only the switches it names. */
export const McpSettingsPatchSchema = McpSettingsSchema.partial();
