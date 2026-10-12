import type * as z from "zod";
import type { ComponentAgentAnswerSchema } from "../schemas/components.ts";

export type ComponentAgentAnswer = z.infer<typeof ComponentAgentAnswerSchema>;

/** A project component's variable, as its instances key their controls: by `id`. */
export interface ComponentVariableInfo {
  readonly id: string;
  readonly name: string;
  readonly type: string;
}
