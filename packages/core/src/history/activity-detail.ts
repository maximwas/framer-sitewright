import type * as z from "zod";
import { DETAIL_MAX_IMAGES, DETAIL_MAX_NODES, DETAIL_MAX_TEXT } from "../constants/history.ts";
import type { ActivityDetail } from "../types/history.ts";
import type { Operation } from "../types/operations.ts";
import { clipText, isPreviewImage } from "../utils/text.ts";

/**
 * What a successful call read or made, as the operation describes it, or null when it does not. Never throws: the
 * panel's detail must not fail the call it describes.
 */
export function describeCall<I extends z.ZodObject, O extends z.ZodObject>(
  operation: Operation<I, O>,
  rawInput: unknown,
  output: z.output<O>,
): ActivityDetail | null {
  const parsed = operation.input.safeParse(rawInput);

  if (operation.describe === undefined || !parsed.success) {
    return null;
  }

  try {
    return trimDetail(operation.describe(parsed.data, output));
  } catch {
    return null;
  }
}

/** A detail within the journal's limits: short texts, a few nodes and previewable images, no repeats. */
export function trimDetail(detail: Partial<ActivityDetail>): ActivityDetail {
  const nodes = new Map((detail.nodes ?? []).map((node) => [node.id, clipText(node.name, DETAIL_MAX_TEXT)]));

  return {
    subject: clip(detail.subject),
    summary: clip(detail.summary),
    nodes: [...nodes].slice(0, DETAIL_MAX_NODES).map(([id, name]) => ({
      id,
      name,
    })),
    images: [...new Set(detail.images ?? [])].filter(isPreviewImage).slice(0, DETAIL_MAX_IMAGES),
  };
}

function clip(text: string | null | undefined): string | null {
  return text ? clipText(text, DETAIL_MAX_TEXT) : null;
}
