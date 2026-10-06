import * as z from "zod";
import { MAKE_LOCAL_BLOCKED_HINT, MAKE_LOCAL_CONFIRMATION, MAKE_LOCAL_UNDO_NOTE } from "../../constants/components.ts";
import { requireAgent } from "../../framer/runtime.ts";
import { inSitewrightTerms } from "../../utils/components.ts";
import { defineOperation } from "../define.ts";
import { readAgentAnswer, refusal } from "./agent-answer.ts";

const LocalCopySchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Set when a code component became a code file of the project. */
  codeFile: z.string().nullable(),
});

/**
 * Copies an external component (Marketplace, shared library) into the project, so its layers can take the site's
 * tokens and text styles. Without replaceAll Framer asks first (needs_confirmation); that goes back to the agent, which
 * asks the user: replaceAll comes from the input only, never from a default here.
 */
export const componentMakeLocal = defineOperation({
  name: "components.makeLocal",
  effect: "write",
  idempotent: false,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    nodeId: z
      .string()
      .min(1)
      .describe("The instance of an external component (ComponentInstanceNode) to make local, from nodes_read."),
    replaceAll: z
      .boolean()
      .exactOptional()
      .describe(
        "The user's choice after a needs_confirmation answer: true points every instance of the component at the local copy, false only this one. Leave it out on the first call.",
      ),
  }),
  output: z.object({
    status: z.enum(["success", "needs_confirmation"]),
    nodeId: z.string(),
    /** The local copy; null while Framer waits for replaceAll. */
    component: LocalCopySchema.nullable(),
    /** What happened and what to do next. */
    message: z.string(),
  }),
  async run({ runtime, history }, { nodeId, replaceAll }) {
    const agent = requireAgent(runtime);
    const answer = readAgentAnswer(
      await agent.makeExternalComponentLocal(
        replaceAll === undefined
          ? { id: nodeId }
          : {
              id: nodeId,
              replaceAll,
            },
      ),
      "make local",
    );

    if (answer.status === "needs_confirmation") {
      return {
        status: "needs_confirmation" as const,
        nodeId,
        component: null,
        message: MAKE_LOCAL_CONFIRMATION,
      };
    }

    if (answer.status !== "success") {
      throw refusal(answer, "Framer did not make the component local", MAKE_LOCAL_BLOCKED_HINT);
    }

    history?.markIncomplete(MAKE_LOCAL_UNDO_NOTE);

    const made = answer.component ?? null;
    const component =
      made === null
        ? null
        : {
            id: made.id,
            name: made.displayName ?? made.id,
            codeFile: made.filePath ?? null,
          };

    return {
      status: "success" as const,
      nodeId,
      component,
      message: [answer.message ?? null, nextSteps(component, replaceAll ?? false)]
        .flatMap((part) => (part === null ? [] : [inSitewrightTerms(part)]))
        .join(" "),
    };
  },
  describe({ nodeId }, { status, component }) {
    return {
      subject: component?.name ?? null,
      summary: summaryOf(status, component),
      nodes: [
        {
          id: nodeId,
          name: component?.name ?? "Instance",
        },
      ],
    };
  },
  // Nothing changed while Framer waits for the user's choice: the journal shows it as not done.
  refused({ status }) {
    return status === "needs_confirmation" ? "Framer asked whether to make only this instance local or all." : null;
  },
});

function nextSteps(component: z.output<typeof LocalCopySchema> | null, replaceAll: boolean): string {
  const instances = replaceAll
    ? "Every instance of it uses the copy now."
    : "This instance uses the copy now; the others keep the external component.";

  if (component === null) {
    return `${instances} components_read lists the copy.`;
  }

  if (component.codeFile !== null) {
    return `${component.name} is the code file ${component.codeFile} now: change its colors and type in its code with code_file_read and code_file_write. ${instances}`;
  }

  return `${component.name} is a project component now (${component.id}): restyle its layers with the site's color tokens and text styles through design_apply (nodes_read with its id shows them). ${instances} To change only this placement, detach it with component_detach.`;
}

function summaryOf(
  status: "success" | "needs_confirmation",
  component: z.output<typeof LocalCopySchema> | null,
): string {
  if (status === "needs_confirmation") {
    return "Waiting for the user's choice";
  }

  const codeFile = component?.codeFile ?? null;

  return codeFile === null ? "Local component" : `Code file ${codeFile}`;
}
