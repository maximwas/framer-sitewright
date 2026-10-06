import type * as z from "zod";
import type { HistoryRecorder } from "../history/recorder.ts";
import type { ViaUsedSchema } from "../schemas/operations.ts";
import type { FramerRuntime } from "./framer.ts";
import type { ActivityDetail } from "./history.ts";

export interface OperationContext {
  readonly runtime: FramerRuntime;
  /** Set when the call is journaled: write operations record what they changed, so it can be undone. */
  readonly history?: HistoryRecorder;
}

/** What an operation does to the project; the MCP layer derives tool annotations from it. */
export type OperationEffect = "read" | "write" | "destructive";

/** Protected Plugin API methods an operation calls (checked with framer.isAllowedTo in the plugin). */
export type PluginPermission =
  | "createColorStyle"
  | "ColorStyle.setAttributes"
  | "ColorStyle.remove"
  | "createTextStyle"
  | "TextStyle.setAttributes"
  | "TextStyle.remove"
  | "addSVG"
  | "addComponentInstance"
  | "setParent"
  | "setCustomCode"
  | "createCodeFile"
  | "CodeFile.setFileContent"
  | "CodeFile.remove"
  | "Node.setAttributes"
  | "createCollection"
  | "Collection.addFields"
  | "Collection.removeFields"
  | "Collection.setFieldOrder"
  | "Collection.addItems"
  | "Collection.removeItems"
  | "Collection.setItemOrder"
  | "setLocalizationData"
  | "createWebPage"
  | "createDesignPage"
  | "removeNodes"
  | "addRedirects"
  | "removeRedirects"
  | "setRedirectOrder"
  | "publish";

/** A unit of work with typed input and output that runs wherever the `framer` object lives. */
export interface Operation<I extends z.ZodObject, O extends z.ZodObject> {
  readonly name: string;
  readonly effect: OperationEffect;
  /** The same input twice leaves the same state, so the operation may be re-run after a lost session. */
  readonly idempotent: boolean;
  readonly permissions: readonly PluginPermission[];
  /**
   * Whether the call needs framer.agent (the DSL, Server API only), for a given input. Omitted: never. The router
   * sends every other call to the plugin when it is connected.
   */
  readonly needsAgent?: boolean | ((input: z.output<I>) => boolean);
  /** The call reads the open editor (the selection), so the router sends it to the plugin whatever the mode. */
  readonly needsPlugin?: boolean;
  readonly input: I;
  readonly output: O;
  run(context: OperationContext, input: z.output<I>): Promise<z.input<O>>;
  /** What a successful call read or made, for the activity panel; the journal trims the lists. */
  describe?(input: z.output<I>, output: z.output<O>): Partial<ActivityDetail>;
  /**
   * What Framer refused although the call returned (design_apply reports rejected commands in its result, not by
   * throwing), or null; the journal then records the call as failed or partial instead of ok.
   */
  refused?(output: z.output<O>): string | null;
}

export type AnyOperation = Operation<z.ZodObject, z.ZodObject>;

export type Via = z.infer<typeof ViaUsedSchema>;
