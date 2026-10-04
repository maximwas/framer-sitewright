import type * as z from "zod";
import type { AnyOperation, Operation, OperationContext } from "../types/operations.ts";

export function defineOperation<I extends z.ZodObject, O extends z.ZodObject>(
  operation: Operation<I, O>,
): Operation<I, O> {
  return operation;
}

export async function runOperation<I extends z.ZodObject, O extends z.ZodObject>(
  operation: Operation<I, O>,
  context: OperationContext,
  rawInput: unknown,
): Promise<z.output<O>> {
  const input = operation.input.parse(rawInput);
  const output = await operation.run(context, input);

  return operation.output.parse(output);
}

/** Whether this call of `operation` needs framer.agent; input that does not parse is left to the operation to refuse. */
export function needsAgent(operation: AnyOperation, rawInput: unknown): boolean {
  const flag = operation.needsAgent;

  if (typeof flag !== "function") {
    return flag ?? false;
  }

  const parsed = operation.input.safeParse(rawInput);

  return parsed.success && flag(parsed.data);
}
