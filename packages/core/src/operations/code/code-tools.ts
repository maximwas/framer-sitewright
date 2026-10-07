import * as z from "zod";
import { CODE_FILES_READ_MAX, CODE_LINT_RULES, CODE_PATCH_EDITS_MAX } from "../../constants/code.ts";
import { OperationError } from "../../errors.ts";
import { CodeFileSummarySchema } from "../../schemas/code.ts";
import type { CodeDiagnosticData, CodeFileHandle, FramerPort } from "../../types/framer-port.ts";
import { patchCode } from "../../utils/code-patch.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";
import { matches, summaryOf } from "./code-files.ts";

const DiagnosticSchema = z.object({
  severity: z.string(),
  message: z.string(),
  line: z.number().int().nullable(),
  column: z.number().int().nullable(),
});

async function findFile(port: FramerPort, name: string): Promise<CodeFileHandle> {
  const file = (await port.getCodeFiles()).find((candidate) => matches(candidate, name));

  if (file === undefined) {
    throw new OperationError("NOT_FOUND", `No code file "${name}".`, "List them with code_files_list.");
  }

  return file;
}

function diagnostic(found: CodeDiagnosticData, fallback: string): z.output<typeof DiagnosticSchema> {
  const start = found.span?.start;

  return {
    severity: found.severity ?? fallback,
    message: found.message,
    line: start === undefined ? null : start.line + 1,
    column: start === undefined ? null : start.character + 1,
  };
}

/** TypeScript's errors for the file, plus the lint warnings while Framer still lints. */
async function diagnosticsOf(file: CodeFileHandle): Promise<z.output<typeof DiagnosticSchema>[]> {
  const typed = (await file.typecheck?.().catch(() => [])) ?? [];
  const linted = (await file.lint?.({ ...CODE_LINT_RULES }).catch(() => [])) ?? [];

  return [...typed.map((found) => diagnostic(found, "error")), ...linted.map((found) => diagnostic(found, "warning"))];
}

export const codeFilesRead = defineOperation({
  name: "codeFiles.readMany",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({
    names: z.array(z.string().min(1)).min(1).max(CODE_FILES_READ_MAX).describe("File names or paths."),
  }),
  output: z.object({
    files: z.array(CodeFileSummarySchema.extend({ content: z.string() })),
    missing: z.array(z.string()),
  }),
  async run({ runtime }, { names }) {
    const files = await runtime.port.getCodeFiles();
    const found = names.map((name) => files.find((file) => matches(file, name)));

    return {
      files: found.flatMap((file) =>
        file === undefined
          ? []
          : [
              {
                ...summaryOf(file),
                content: file.content,
              },
            ],
      ),
      missing: names.filter((_, index) => found[index] === undefined),
    };
  },
  describe(_input, { files }) {
    return { summary: countOf(files.length, "file") };
  },
});

export const codeFilePatch = defineOperation({
  name: "codeFiles.patch",
  effect: "destructive",
  idempotent: false,
  permissions: ["CodeFile.setFileContent"],
  input: z.strictObject({
    name: z.string().min(1).describe("File name or path."),
    edits: z
      .array(
        z.strictObject({
          find: z.string().min(1).describe("Text in the file, exactly, with enough around it to be found once."),
          replace: z.string(),
          all: z.boolean().default(false).describe("Replace every occurrence instead of exactly one."),
        }),
      )
      .min(1)
      .max(CODE_PATCH_EDITS_MAX),
  }),
  output: CodeFileSummarySchema.extend({
    lines: z.number().int(),
    diagnostics: z.array(DiagnosticSchema),
  }),
  async run({ runtime }, { name, edits }) {
    const file = await findFile(runtime.port, name);
    const patched = patchCode(file.content, edits);

    if (patched.failed.length > 0) {
      throw new OperationError(
        "INVALID_INPUT",
        `Nothing changed: ${patched.failed.join("; ")}.`,
        "Read the file with code_file_read.",
      );
    }

    const written = await file.setFileContent(patched.code);

    return {
      ...summaryOf(written),
      lines: patched.code.split("\n").length,
      diagnostics: await diagnosticsOf(written),
    };
  },
  describe({ name, edits }, { diagnostics }) {
    return {
      subject: name,
      summary: `${countOf(edits.length, "edit")}, ${countOf(diagnostics.length, "problem")}`,
    };
  },
});

export const codeFileRename = defineOperation({
  name: "codeFiles.rename",
  effect: "write",
  idempotent: true,
  permissions: ["CodeFile.rename"],
  input: z.strictObject({
    name: z.string().min(1).describe("File name or path."),
    newName: z.string().min(1).describe("The new name, e.g. Marquee.tsx."),
  }),
  output: CodeFileSummarySchema,
  async run({ runtime }, { name, newName }) {
    const file = await findFile(runtime.port, name);

    if (file.rename === undefined) {
      throw new OperationError("UNSUPPORTED_TRANSPORT", "This Framer connection cannot rename code files.");
    }

    return summaryOf(await file.rename(newName));
  },
  describe({ name, newName }) {
    return { subject: `${name} → ${newName}` };
  },
});

export const codeFileCheck = defineOperation({
  name: "codeFiles.check",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({ name: z.string().min(1).describe("File name or path.") }),
  output: z.object({
    name: z.string(),
    diagnostics: z.array(DiagnosticSchema),
  }),
  async run({ runtime }, { name }) {
    const file = await findFile(runtime.port, name);

    return {
      name: file.name,
      diagnostics: await diagnosticsOf(file),
    };
  },
  describe({ name }, { diagnostics }) {
    return {
      subject: name,
      summary: countOf(diagnostics.length, "problem"),
    };
  },
});
