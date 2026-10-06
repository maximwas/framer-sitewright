import type { ServerContext, ToolAnnotations } from "@modelcontextprotocol/server";
import type * as z from "zod";
import type { BriefStore } from "../brief/brief-store.ts";
import type { CapabilityTracker } from "../capabilities/capability-tracker.ts";
import type { DocsCache } from "../docs/docs-cache.ts";
import type { ActivityJournal } from "../history/activity-journal.ts";
import type { ActivityUndo } from "../history/activity-undo.ts";
import type { DocsOutputSchema } from "../schemas/mcp.ts";
import type { SettingsStore } from "../settings/settings-store.ts";
import type { SupportReminder } from "../support/support-reminder.ts";
import type { TransportRouter } from "../transports/router.ts";

export interface ToolMetadata {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly input: z.ZodObject;
  readonly output: z.ZodObject;
  readonly annotations: ToolAnnotations;
}

export interface ToolDefinition<I extends z.ZodObject, O extends z.ZodObject> extends ToolMetadata {
  readonly input: I;
  readonly output: O;
  run(args: z.output<I>, context: ServerContext): Promise<z.input<O>>;
}

/** Name, title and description of a tool that runs one core operation, and a check that may refuse the call first. */
export interface OperationToolInfo extends Pick<ToolMetadata, "name" | "title" | "description"> {
  readonly before?: () => Promise<void>;
}

export interface ImageSize {
  readonly width: number;
  readonly height: number;
}

/** A screenshot from Framer's CDN as the model gets it: `size` is the capture's, `shown` the image's; null if unread. */
export interface ScreenshotImage {
  readonly data: Uint8Array;
  readonly mimeType: string;
  readonly size: ImageSize | null;
  readonly shown: ImageSize | null;
}

/** What tools work with: the transports that reach Framer, the DSL reference, the activity journal and the plan. */
export interface ToolContext {
  readonly transports: TransportRouter;
  readonly docs: DocsCache;
  /** Every operation tool runs through the journal, so each call is recorded and writes can be undone. */
  readonly journal: ActivityJournal;
  readonly undo: ActivityUndo;
  /** Learns from failed calls which features the project's plan lacks. */
  readonly capabilities: CapabilityTracker;
  /** The journal in a browser (activity_open). */
  /** The local app: the journal page and the plugin's bridge window, served by the bridge's owner. */
  readonly localApp: { readonly url: () => string | null };
  readonly settings: SettingsStore;
  /** The note on supporting the project, when one is due after a change. */
  readonly support: SupportReminder;
  /** Each project's brief (project_brief). */
  readonly briefs: BriefStore;
}

export type DocsOutput = z.input<typeof DocsOutputSchema>;
