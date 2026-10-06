import * as z from "zod";
import { PRODUCT } from "../../constants/product.ts";
import { OperationError } from "../../errors.ts";
import type { FramerPort } from "../../types/framer-port.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

interface PluginDataHolder {
  getPluginData(key: string): Promise<string | null>;
  setPluginData(key: string, value: string | null): Promise<void>;
  getPluginDataKeys(): Promise<string[]>;
}

function holds(value: unknown): value is PluginDataHolder {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>)["getPluginData"] === "function" &&
    typeof (value as Record<string, unknown>)["setPluginData"] === "function"
  );
}

/** The project, or one of its nodes, as the holder of this plugin's data. */
async function holderOf(port: FramerPort, nodeId: string | undefined): Promise<PluginDataHolder> {
  if (nodeId !== undefined) {
    const node = await port.getNode(nodeId);

    if (!holds(node)) {
      throw new OperationError(
        "NOT_FOUND",
        `No layer "${nodeId}" that takes plugin data.`,
        "Check the id with nodes_find.",
      );
    }

    return node;
  }

  if (port.getPluginData === undefined || port.setPluginData === undefined || port.getPluginDataKeys === undefined) {
    throw new OperationError(
      "UNSUPPORTED_TRANSPORT",
      `Plugin data is kept by the ${PRODUCT.title} plugin.`,
      `Ask the user to open the ${PRODUCT.title} plugin in this project.`,
    );
  }

  return port as PluginDataHolder;
}

const target = z.string().min(1).exactOptional().describe("A layer; omit for the project itself.");

export const pluginDataGet = defineOperation({
  name: "pluginData.get",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsPlugin: true,
  input: z.strictObject({
    nodeId: target,
    key: z.string().min(1).exactOptional().describe("One key; omit to list every key with its value."),
  }),
  output: z.object({ data: z.record(z.string(), z.string().nullable()) }),
  async run({ runtime }, { nodeId, key }) {
    const holder = await holderOf(runtime.port, nodeId);
    const keys = key === undefined ? await holder.getPluginDataKeys() : [key];
    const values = await Promise.all(keys.map((name) => holder.getPluginData(name)));

    return { data: Object.fromEntries(keys.map((name, index) => [name, values[index] ?? null])) };
  },
  describe({ nodeId }, { data }) {
    return {
      subject: nodeId ?? "Project",
      summary: countOf(Object.keys(data).length, "key"),
    };
  },
});

export const pluginDataSet = defineOperation({
  name: "pluginData.set",
  effect: "write",
  idempotent: true,
  permissions: ["setPluginData", "Node.setPluginData"],
  needsPlugin: true,
  input: z.strictObject({
    nodeId: target,
    key: z.string().min(1),
    value: z
      .string()
      .nullable()
      .describe("The text to keep (Framer allows 2 KB a key, 4 KB in all); null deletes the key."),
  }),
  output: z.object({
    key: z.string(),
    deleted: z.boolean(),
  }),
  async run({ runtime }, { nodeId, key, value }) {
    await (await holderOf(runtime.port, nodeId)).setPluginData(key, value);

    return {
      key,
      deleted: value === null,
    };
  },
  describe({ nodeId, key }, { deleted }) {
    return {
      subject: `${nodeId ?? "Project"} · ${key}`,
      summary: deleted ? "Deleted" : "Saved",
    };
  },
});
