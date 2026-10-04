import type { McpServer } from "@modelcontextprotocol/server";
import {
  ACTIVITY_VIEWS,
  ActivityEntrySchema,
  ActivitySummarySchema,
  EntryRefSchema,
  OperationError,
  RevertReportSchema,
  refOf,
} from "@sitewright/core";
import * as z from "zod";
import {
  ACTIVITY_GET_MAX_CHARS,
  CHECKPOINT_ANNOTATIONS,
  OPEN_ANNOTATIONS,
  READ_ONLY_ANNOTATIONS,
  REVERT_ANNOTATIONS,
} from "../../constants/mcp.ts";
import { listActivity } from "../../history/activity-api.ts";
import { RevertOptionsShape } from "../../schemas/mcp.ts";
import { ProjectRefSchema } from "../../schemas/transports.ts";
import type { ToolContext } from "../../types/mcp.ts";
import { addTool } from "../add-tool.ts";

export function registerActivityTools(server: McpServer, { journal, undo, localApp }: ToolContext): void {
  addTool(server, {
    name: "activity_open",
    title: "Open the activity journal",
    description:
      "Returns the link to the local app in the browser: the activity journal with everything the AI did in the project, undo, redo and checkpoints, the settings (custom code, code components, plugin first), and the window that connects the Framer plugin. Give the link to the user.",
    input: z.strictObject({}),
    output: z.object({ url: z.string() }),
    annotations: OPEN_ANNOTATIONS,
    run: async () => {
      const url = localApp.url();

      if (url === null) {
        throw new OperationError(
          "NOT_CONFIGURED",
          "The local app is not running: the plugin bridge is off or could not start.",
          "Set SITEWRIGHT_PLUGIN_BRIDGE=on (the default) and reconnect the MCP server; framer_status shows why the bridge is down.",
        );
      }

      return { url };
    },
  });

  addTool(server, {
    name: "activity_list",
    title: "Activity journal",
    description:
      "Lists what the AI did in this Framer project, newest first: every tool call, undo, redo, restore, checkpoint and skill used, with a human title, the layer it ran through (plugin-api, server-api, framer-agent) and whether it can be undone. show picks changes with the skills (default), reads, skills, or all.",
    input: z.strictObject({
      limit: z.number().int().min(1).max(100).default(20),
      show: z.enum(ACTIVITY_VIEWS).default("changes"),
    }),
    output: z.object({
      project: ProjectRefSchema.nullable(),
      entries: z.array(ActivitySummarySchema),
      canUndo: z.boolean(),
      canRedo: z.boolean(),
      total: z.number().int(),
    }),
    annotations: READ_ONLY_ANNOTATIONS,
    run: ({ limit, show }) =>
      listActivity(journal, {
        limit,
        show,
      }),
  });

  addTool(server, {
    name: "activity_get",
    title: "Activity entry",
    description: "One journal entry in full, including its undo steps (the state before and after each change).",
    input: z.strictObject({ id: z.string().min(1) }),
    output: z.object({ entry: ActivityEntrySchema.nullable() }),
    annotations: READ_ONLY_ANNOTATIONS,
    run: async ({ id }) => {
      const project = await journal.currentProject();
      const entries = project === null ? [] : await journal.entries(project.id);
      const entry = entries.find((candidate) => candidate.id === id) ?? null;
      const chars = JSON.stringify(entry).length;

      if (chars > ACTIVITY_GET_MAX_CHARS) {
        throw new OperationError(
          "RESULT_TOO_LARGE",
          `The entry is ${chars} characters (limit ${ACTIVITY_GET_MAX_CHARS}): its steps hold large node snapshots.`,
          "activity_list shows what it changed; undo and restore work without reading it.",
        );
      }

      return { entry };
    },
  });

  addTool(server, {
    name: "activity_checkpoint",
    title: "Mark a checkpoint",
    description:
      "Marks a point in the activity journal (call it when you start a new user task). activity_restore can later roll the project back to it.",
    input: z.strictObject({ label: z.string().min(1).max(120) }),
    output: z.object({ checkpoint: EntryRefSchema.nullable() }),
    annotations: CHECKPOINT_ANNOTATIONS,
    run: async ({ label }) => {
      const entry = await journal.checkpoint(label, "ai");

      return { checkpoint: entry === null ? null : refOf(entry) };
    },
  });

  addTool(server, {
    name: "activity_undo",
    title: "Undo an AI change",
    description:
      "Undoes the newest AI change still in effect, or the entry given by entryId; andLater also undoes every change made after that entry, bringing the project back to how it was before it. Items someone changed after the AI are reported as conflicts and kept unless onConflict is force; an undo that kept every item changes nothing, so the entry can be undone again with force. Color tokens, text styles and design_apply edits undo exactly; deleted nodes come back with new ids (results[].newId). Undoing DSL edits needs the Server API.",
    input: z.strictObject({
      entryId: z.string().min(1).exactOptional(),
      andLater: z.boolean().default(false).describe("Also undo every change made after entryId."),
      dryRun: z.boolean().default(false).describe("Only report what would happen."),
      ...RevertOptionsShape,
    }),
    output: RevertReportSchema,
    annotations: REVERT_ANNOTATIONS,
    run: ({ entryId, andLater, dryRun, onConflict }) =>
      undo.undo(
        entryId,
        {
          dryRun,
          onConflict,
          actor: "ai",
        },
        andLater,
      ),
  });

  addTool(server, {
    name: "activity_redo",
    title: "Redo an undone change",
    description: "Reapplies the newest undo or restore still in effect, or the one given by entryId.",
    input: z.strictObject({
      entryId: z.string().min(1).exactOptional(),
      dryRun: z.boolean().default(false).describe("Only report what would happen."),
      ...RevertOptionsShape,
    }),
    output: RevertReportSchema,
    annotations: REVERT_ANNOTATIONS,
    run: ({ entryId, dryRun, onConflict }) =>
      undo.redo(entryId, {
        dryRun,
        onConflict,
        actor: "ai",
      }),
  });

  addTool(server, {
    name: "activity_restore",
    title: "Restore to a checkpoint",
    description:
      "Brings the project back to how it was at a checkpoint: undoes the changes made after it and redoes undos of older changes made since. Runs as a dry run unless dryRun is false, so check the preview first.",
    input: z.strictObject({
      checkpointId: z.string().min(1),
      dryRun: z.boolean().default(true).describe("Preview only (default). Set false to restore."),
      ...RevertOptionsShape,
    }),
    output: RevertReportSchema,
    annotations: REVERT_ANNOTATIONS,
    run: ({ checkpointId, dryRun, onConflict }) =>
      undo.restore(checkpointId, {
        dryRun,
        onConflict,
        actor: "ai",
      }),
  });
}
