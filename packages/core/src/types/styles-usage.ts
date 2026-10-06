import type * as z from "zod";
import type { StyleUsageSchema } from "../schemas/styles-usage.ts";

export type StyleUsage = z.infer<typeof StyleUsageSchema>;

/** A page, component, design page or layout whose layers are read; web pages are read on their own path. */
export interface UsageScope {
  readonly id: string;
  /** How usedIn names it: the page path, or "component Navigation/Header". */
  readonly label: string;
  readonly pagePath: string | undefined;
}

/** What one scope answered: Framer's list of the styles it uses, and its layers. */
export interface ScopeUsage {
  readonly label: string;
  readonly references: unknown;
  readonly layers: unknown;
}

/** A style that can be named by id, by path or by its last segment, the way layers name text and link styles. */
export interface NamedStyle {
  readonly id: string;
  readonly path: string;
}
