import { CopyField } from "@sitewright/ui";
import { motion } from "motion/react";
import { version as pluginVersion } from "../../package.json";
import { UPDATE_COMMAND } from "../constants/setup.ts";
import { copyText } from "../framer/plugin.ts";

/**
 * Asks for the MCP server to be updated, with the command: Framer updates the plugin by itself, the server on the
 * user's computer stays as installed, and new tools need both.
 */
export function UpdateNote({ serverVersion }: { readonly serverVersion: string | null }) {
  return (
    <motion.section
      className="flex flex-col gap-1.5 rounded-xl bg-sw-warn-soft px-3 py-2.5"
      initial={{
        opacity: 0,
        y: 6,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
    >
      <h2 className="font-semibold text-[12.5px] text-sw-warn">Update the MCP server</h2>
      <p className="text-[11.5px] text-sw-ink-2">
        {serverVersion === null
          ? `It no longer matches this plugin (${pluginVersion}).`
          : `It is ${serverVersion}, this plugin ${pluginVersion}: new tools need both.`}{" "}
        Run this in a terminal, then restart Sitewright in your AI client (in Claude Code: /mcp, sitewright, Reconnect).
      </p>
      <CopyField text={UPDATE_COMMAND} copy={copyText} />
    </motion.section>
  );
}
