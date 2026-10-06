import type { PublishIssue } from "../types/publish.ts";
import { isPlainObject } from "./guards.ts";

/** A preview error or warning as text and the layer it is on: Framer gives a string or `{ message, nodeId? }`. */
export function publishIssueOf(entry: unknown): PublishIssue {
  if (typeof entry === "string") {
    return {
      message: entry,
      nodeId: null,
    };
  }

  if (isPlainObject(entry)) {
    const text = [entry.message, entry.title, entry.text, entry.description].find((value) => typeof value === "string");

    return {
      message: typeof text === "string" ? text : JSON.stringify(entry),
      nodeId: typeof entry.nodeId === "string" ? entry.nodeId : null,
    };
  }

  return {
    message: JSON.stringify(entry),
    nodeId: null,
  };
}
