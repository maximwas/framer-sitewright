import type { McpServer } from "@modelcontextprotocol/server";
import {
  codeFileCheck,
  codeFileDelete,
  codeFilePatch,
  codeFileRead,
  codeFileRename,
  codeFilesList,
  codeFilesRead,
  codeFileWrite,
  codeTemplateInsert,
  customCodeGet,
  customCodeSet,
  type McpSettings,
  OperationError,
  themeToggleAdd,
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

  addOperationTool(server, context, codeFilesRead, {
    name: "code_files_read",
    title: "Read several code files",
    description: "Returns the source of up to 25 code files in one call; names not found are listed in missing.",
  });

  addOperationTool(server, context, codeFilePatch, {
    name: "code_file_patch",
    title: "Edit part of a code file",
    description: `Changes a code file by find-and-replace edits, in order, so only the changed snippets travel: each find must be in the file exactly once (or pass all), or nothing changes. Returns the TypeScript problems of the new version. ${CODE_TOOLS_RULE} Works only while the user has Code components switched on in the plugin.`,
    before: allowed("codeComponents"),
  });

  addOperationTool(server, context, codeFileRename, {
    name: "code_file_rename",
    title: "Rename a code file",
    description:
      "Renames a code file. Its components and overrides keep working on the canvas. Works only while the user has Code components switched on in the plugin.",
    before: allowed("codeComponents"),
  });

  addOperationTool(server, context, themeToggleAdd, {
    name: "theme_toggle_add",
    title: "Add a light and dark switch",
    description: `Writes a code override that switches the site between its color tokens' light and dark values when clicked, starting from the visitor's last choice or system theme and remembering it, and attaches it to the layer you give (a button or an icon). Framer has no theme switch of its own. Tokens without a dark value stay as they are. Works only while the user has Code components switched on in the plugin.`,
    before: allowed("codeComponents"),
  });

  addOperationTool(server, context, codeTemplateInsert, {
    name: "component_template_insert",
    title: "Add a ready code component",
    description: `Adds a ready code component as a code file (accordion, tabs, countdown, marquee, scroll progress; component_templates lists them): property controls for its texts and colors, springs for its motion. Place it with component_insert by the file's component, then set its controls. ${CODE_TOOLS_RULE} Works only while the user has Code components switched on in the plugin.`,
    before: allowed("codeComponents"),
  });

  addOperationTool(server, context, codeFileCheck, {
    name: "code_file_check",
    title: "Check a code file",
    description:
      "Returns a code file's problems as Framer compiles it: TypeScript errors with line and column (and lint warnings while Framer still reports them). Run it after writing code, before telling the user it works.",
  });

  addOperationTool(server, context, codeFileWrite, {
    name: "code_file_write",
    title: "Write a code file",
    description: `Creates or replaces a code file: a React code component or a code override for Framer. The replaced version is not returned (only its size): read it with code_file_read first when you may need it back. ${CODE_TOOLS_RULE} Works only while the user has Code components switched on in the plugin.`,
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
