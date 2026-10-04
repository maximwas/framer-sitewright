import type { McpServer, ServerContext, ToolAnnotations } from "@modelcontextprotocol/server";
import { type ActivityNote, ActivityNoteSchema, type Operation } from "@sitewright/core";
import * as z from "zod";
import type { OperationToolInfo, ToolContext, ToolDefinition, ToolMetadata } from "../types/mcp.ts";
import { describeError } from "./describe-error.ts";

/**
 * A tool that runs `operation` on the active transport, through the activity journal. Its annotations follow from the
 * operation's metadata, and its result carries the activity note (see ActivityNoteSchema).
 */
export function addOperationTool<I extends z.ZodObject, O extends z.ZodObject>(
  server: McpServer,
  context: ToolContext,
  operation: Operation<I, O>,
  tool: OperationToolInfo,
): void {
  const { before, ...info } = tool;
  const metadata = {
    ...info,
    input: operation.input,
    output: operation.output.extend({
      activity: ActivityNoteSchema,
      support: z.string().exactOptional(),
    }),
    annotations: operationAnnotations(operation),
  };

  registerStructuredTool(server, metadata, async (args) => {
    await before?.();

    return runOperationTool(context, tool.name, operation, args);
  });
}

/**
 * Journals the call, learns from a failure whether the plan lacks the feature, and adds the activity note; after a
 * change that worked, the support note when one is due.
 */
export async function runOperationTool<I extends z.ZodObject, O extends z.ZodObject>(
  { journal, capabilities, support }: ToolContext,
  name: string,
  operation: Operation<I, O>,
  args: unknown,
): Promise<z.output<O> & { activity: ActivityNote; support?: string }> {
  try {
    const { output, entry } = await journal.run(name, operation, args);
    const changed = operation.effect !== "read" && entry?.outcome === "ok" && entry.steps.length > 0;
    const note = changed ? await support.due() : null;

    return {
      ...output,
      activity: await journal.noteFor(entry),
      ...(note === null ? {} : { support: note }),
    };
  } catch (error) {
    await capabilities.observe(name, error);

    throw error;
  }
}

export function addTool<I extends z.ZodObject, O extends z.ZodObject>(
  server: McpServer,
  tool: ToolDefinition<I, O>,
): void {
  // The SDK has validated args already, but its callback type cannot follow a generic schema: parsing types them.
  registerStructuredTool(server, tool, (args, context) => tool.run(tool.input.parse(args), context));
}

/** Tool annotations from what the operation does to the project. */
export function operationAnnotations({ effect, idempotent }: Operation<z.ZodObject, z.ZodObject>): ToolAnnotations {
  switch (effect) {
    case "read":
      return {
        readOnlyHint: true,
        idempotentHint: idempotent,
        openWorldHint: true,
      };
    case "write":
      return {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: idempotent,
        openWorldHint: true,
      };
    case "destructive":
      return {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: idempotent,
        openWorldHint: true,
      };
  }
}

/**
 * Registers a tool whose result is always structuredContent validated against its outputSchema.
 * Claude Code shows the model only structuredContent, so hints and diagnostics live there.
 */
function registerStructuredTool(
  server: McpServer,
  tool: ToolMetadata,
  run: (args: Record<string, unknown>, context: ServerContext) => Promise<unknown>,
): void {
  const { name, title, description, input: inputSchema, output: outputSchema, annotations } = tool;

  server.registerTool(
    name,
    {
      title,
      description,
      inputSchema,
      outputSchema,
      annotations,
    },
    async (args, context) => {
      let result: unknown;

      try {
        result = await run(args, context);
      } catch (error) {
        throw new Error(describeError(error), { cause: error });
      }

      const data: Record<string, unknown> = outputSchema.parse(result);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data),
          },
        ],
        structuredContent: data,
      };
    },
  );
}
