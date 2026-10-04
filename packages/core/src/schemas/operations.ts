import * as z from "zod";

export const ViaSchema = z
  .enum(["auto", "dsl", "plugin-api"])
  .default("auto")
  .describe(
    'How to write: "dsl" (framer.agent, Server API only), "plugin-api" (works on both transports), "auto" (dsl when available).',
  );

/** The write strategy an operation actually used. */
export const ViaUsedSchema = z.enum(["dsl", "plugin-api"]);
