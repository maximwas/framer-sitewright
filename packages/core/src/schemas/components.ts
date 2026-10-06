import * as z from "zod";

/**
 * What framer.agent.makeExternalComponentLocal and flattenComponentInstance answer (06.10.2026): `status` is success,
 * needs_confirmation (make local without replaceAll) or blocked, with `message` saying why.
 */
export const ComponentAgentAnswerSchema = z.looseObject({
  status: z.string(),
  message: z.string().nullish(),
  /** Make local: the copy. `filePath` when a code component became a code file of the project. */
  component: z
    .looseObject({
      id: z.string(),
      displayName: z.string().nullish(),
      filePath: z.string().nullish(),
    })
    .nullish(),
  /** Flatten: the frame that took the instance's place. */
  replacementId: z.string().nullish(),
});
