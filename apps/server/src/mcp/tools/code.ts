import type { McpServer } from "@modelcontextprotocol/server";
import {
  codeFileDelete,
  codeFileRead,
  codeFilesList,
  codeFileWrite,
  customCodeGet,
  customCodeSet,
  type McpSettings,
  OperationError,
} from "@sitewright/core";
import { CODE_SWITCH_HINT, CODE_SWITCH_OFF, CODE_TOOLS_RULE } from "../../constants/mcp.ts";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

export function registerCodeTools(server: McpServer, context: ToolContext): void {
  /** Refuses the write while the user keeps its switch off: the agent never decides on code alone. */
  const allowed = (setting: keyof typeof CODE_SWITCH_OFF & keyof McpSettings) => async () => {
    if (!(await context.settings.get())[setting]) {
      throw new OperationError("PERMISSION_DENIED", CODE_SWITCH_OFF[setting], CODE_SWITCH_HINT);
    }
  };

  addOperationTool(server, context, customCodeGet, {
    name: "custom_code_get",
    title: "Read custom code",
    description: "Shows the site's custom HTML in each location (head start and end, body start and end).",
  });

  addOperationTool(server, context, customCodeSet, {
    name: "custom_code_set",
    title: "Set custom code",
    description: `Sets the site's custom HTML for one location on every page (analytics, verification tags, fonts); html null removes it. ${CODE_TOOLS_RULE} Works only while the user has Custom code switched on in the plugin.`,
    before: allowed("customCode"),
  });

  addOperationTool(server, context, codeFilesList, {
    name: "code_files_list",
    title: "List code files",
    description: "Lists the project's code files with their exports (code components and overrides).",
  });

  addOperationTool(server, context, codeFileRead, {
    name: "code_file_read",
    title: "Read a code file",
    description: "Returns a code file's source.",
  });

  addOperationTool(server, context, codeFileWrite, {
    name: "code_file_write",
    title: "Write a code file",
    description: `Creates or replaces a code file: a React code component or a code override for Framer. ${CODE_TOOLS_RULE} Works only while the user has Code components switched on in the plugin.`,
    before: allowed("codeComponents"),
  });

  addOperationTool(server, context, codeFileDelete, {
    name: "code_file_delete",
    title: "Delete a code file",
    description:
      "Deletes a code file and returns its source. Undo does not bring it back: delete only files you created yourself (a temporary probe) or the user asked to remove. Works only while the user has Code components switched on in the plugin.",
    before: allowed("codeComponents"),
  });
}
