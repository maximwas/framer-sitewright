import * as z from "zod";

const TransportKindSchema = z.enum(["server-api", "plugin"]);

/** How the router picks a transport: auto = the plugin first while it is connected, otherwise the Server API. */
export const TransportModeSchema = z.enum(["auto", "server-api", "plugin"]);

export const ProjectRefSchema = z.object({
  id: z.string(),
  name: z.string(),
});

/** A project with a saved Server API key, as framer_status lists it: never its key or link. */
export const SavedProjectSchema = ProjectRefSchema.extend({
  /** framer_connect { project } chose it: the Server API stays on it until the plugin opens another project. */
  chosen: z.boolean(),
});

export const TransportStatusSchema = z.object({
  transport: TransportKindSchema,
  configured: z.boolean(),
  connected: z.boolean(),
  /** The Framer project this transport edits, once known. Never the URL from .env. */
  project: ProjectRefSchema.nullable(),
  hint: z.string().nullable(),
});

export const RouterStatusSchema = z.object({
  mode: TransportModeSchema,
  active: TransportKindSchema.nullable(),
  /** Always both transports, configured or not. */
  transports: z.array(TransportStatusSchema),
  /** What to do when no transport is active. */
  hint: z.string().nullable(),
  /** The projects with a saved Server API key; framer_connect { project } switches to one. */
  projects: z.array(SavedProjectSchema),
});
