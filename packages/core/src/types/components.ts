import type * as z from "zod";
import type { ComponentAgentAnswerSchema } from "../schemas/components.ts";

export type ComponentAgentAnswer = z.infer<typeof ComponentAgentAnswerSchema>;
