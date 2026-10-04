import type * as z from "zod";
import type { CreatedStyleSchema, StyleRefSchema } from "../schemas/styles.ts";
import type { DslResult } from "./dsl.ts";
import type { Via } from "./operations.ts";

/** What color and text style handles both offer for deletion. */
export interface RemovableStyle {
  readonly id: string;
  remove(): Promise<void>;
}

/** The styles a delete takes, chosen by selectStyles, and the paths and folders it found nothing for. */
export interface StyleSelection<S extends RemovableStyle> {
  readonly found: readonly { readonly path: string; readonly style: S }[];
  readonly notFound: readonly string[];
}

export interface StyleDeletion<S extends RemovableStyle> extends StyleSelection<S> {
  readonly via: Via;
  /** The tool that lists this kind of style, named in WRITE_FAILED hints. */
  readonly listTool: string;
  /** Runs before each Plugin API remove(), for Framer quirks of one style kind. */
  readonly beforeRemove?: (style: S) => Promise<void>;
  /** The DSL node type of a style's breakpoint slots, which a DSL delete leaves behind (see deleteLeftoverSlots). */
  readonly slotNodeType?: string;
}

export interface DslBatch {
  readonly commands: readonly string[];
  /** Styles the commands create, with the temp ids they use. */
  readonly creates: readonly { readonly path: string; readonly tempId: string }[];
}

export type WriteAction = "create" | "update" | "delete";

/** One Plugin API call of a batch. */
export interface PluginApiWrite {
  readonly action: WriteAction;
  readonly path: string;
  /** setAttributes resolves to null when the style no longer exists. */
  run(): Promise<unknown>;
}

export type StyleRef = z.infer<typeof StyleRefSchema>;

export type CreatedStyle = z.infer<typeof CreatedStyleSchema>;

export interface StyleWriteOptions {
  readonly dryRun: boolean;
}

/** What a writer returns, whichever strategy (DSL or Plugin API) it used. */
export interface StyleWriteOutcome {
  created: CreatedStyle[];
  dsl: string;
  diagnostics: DslResult | null;
}

export interface StylePlan {
  readonly updates: readonly { readonly path: string; readonly style: { readonly id: string } }[];
  readonly unchanged: readonly StyleRef[];
}
