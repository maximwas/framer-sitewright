import type { DslResult } from "../types/dsl.ts";
import type { AgentPort } from "../types/framer.ts";
import { errorMessage } from "../utils/errors.ts";
import { assetFailureResult, normalizeDslResult } from "./result.ts";

/** Runs a DSL batch; Framer's answer, normalized. */
export async function applyDsl(agent: AgentPort, dsl: string, pagePath: string): Promise<DslResult> {
  return normalizeDslResult(await agent.applyChanges(dsl, { pagePath }));
}

/**
 * What a DSL batch that threw comes back as. applyChanges throws instead of answering when it cannot download an
 * image URL of the batch, after applying the rest of it: that is a refusal in words. Any other error is thrown again.
 * Catch it outside withDslHistory, which must see the throw: the ids of new nodes are lost with the answer.
 */
export function assetRefusal(error: unknown): DslResult {
  const refused = assetFailureResult(errorMessage(error));

  if (refused === null) {
    throw error;
  }

  return refused;
}
