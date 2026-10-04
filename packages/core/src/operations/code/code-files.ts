import * as z from "zod";
import { OperationError } from "../../errors.ts";
import { CodeFileSummarySchema } from "../../schemas/code.ts";
import type { CodeFileHandle } from "../../types/framer-port.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

function summaryOf(file: CodeFileHandle) {
  return {
    id: file.id,
    name: file.name,
    path: file.path,
    exports: file.exports.map(({ name, type }) => ({
      name,
      type,
    })),
  };
}

export const codeFilesList = defineOperation({
  name: "codeFiles.list",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({}),
  output: z.object({ files: z.array(CodeFileSummarySchema) }),
  async run({ runtime }) {
    return { files: (await runtime.port.getCodeFiles()).map(summaryOf) };
  },
  describe(_input, { files }) {
    return { summary: countOf(files.length, "file") };
  },
});

export const codeFileRead = defineOperation({
  name: "codeFiles.read",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({ name: z.string().min(1).describe("File name or path, e.g. Ticker.tsx.") }),
  output: CodeFileSummarySchema.extend({ content: z.string() }),
  async run({ runtime }, { name }) {
    const file = (await runtime.port.getCodeFiles()).find((candidate) => matches(candidate, name));

    if (file === undefined) {
      throw new OperationError("NOT_FOUND", `No code file "${name}".`, "List them with code_files_list.");
    }

    return {
      ...summaryOf(file),
      content: file.content,
    };
  },
  describe(_input, { name, content }) {
    return {
      subject: name,
      summary: countOf(content.split("\n").length, "line"),
    };
  },
});

export const codeFileWrite = defineOperation({
  name: "codeFiles.write",
  effect: "destructive",
  idempotent: true,
  permissions: ["createCodeFile", "CodeFile.setFileContent"],
  input: z.strictObject({
    name: z
      .string()
      .min(1)
      .describe("File name, e.g. Ticker.tsx; an existing file with this name or path is replaced."),
    code: z.string().min(1).describe("The whole file: a React component or override module for Framer."),
  }),
  output: CodeFileSummarySchema.extend({
    created: z.boolean(),
    previous: z.string().nullable(),
  }),
  async run({ runtime }, { name, code }) {
    const existing = (await runtime.port.getCodeFiles()).find((candidate) => matches(candidate, name));
    const file =
      existing === undefined ? await runtime.port.createCodeFile(name, code) : await existing.setFileContent(code);

    return {
      ...summaryOf(file),
      created: existing === undefined,
      previous: existing?.content ?? null,
    };
  },
  describe(_input, { name, created }) {
    return {
      subject: name,
      summary: created ? "Created" : "Replaced",
    };
  },
});

/** Removes a code file; its source comes back in the result, since undo cannot bring the file back. */
export const codeFileDelete = defineOperation({
  name: "codeFiles.delete",
  effect: "destructive",
  idempotent: false,
  permissions: ["CodeFile.remove"],
  input: z.strictObject({ name: z.string().min(1).describe("File name or path, e.g. Ticker.tsx.") }),
  output: CodeFileSummarySchema.extend({ content: z.string() }),
  async run({ runtime, history }, { name }) {
    const file = (await runtime.port.getCodeFiles()).find((candidate) => matches(candidate, name));

    if (file === undefined) {
      throw new OperationError("NOT_FOUND", `No code file "${name}".`, "List them with code_files_list.");
    }

    await file.remove();
    history?.markIncomplete(
      `Code file ${file.name} deleted: undo does not restore code files; its source is in the result.`,
    );

    return {
      ...summaryOf(file),
      content: file.content,
    };
  },
  describe(_input, { name }) {
    return {
      subject: name,
      summary: "Deleted",
    };
  },
});

function matches(file: CodeFileHandle, name: string): boolean {
  return file.name === name || file.path === name;
}
