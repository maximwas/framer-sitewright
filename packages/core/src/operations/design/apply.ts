import * as z from "zod";
import { AUDIT_AFTER_APPLY_MS } from "../../constants/layout-audit.ts";
import { deferAbsoluteCentering } from "../../dsl/absolute-centering.ts";
import { joinCommands } from "../../dsl/commands.ts";
import { deferIconInitialValues } from "../../dsl/icon-variables.ts";
import { parseDsl } from "../../dsl/parse.ts";
import { assetFailureResult, normalizeDslResult } from "../../dsl/result.ts";
import { nextTempId } from "../../dsl/temp-ids.ts";
import { OperationError } from "../../errors.ts";
import { withDslHistory } from "../../history/dsl/dsl-history.ts";
import { applyXmlWithPluginApi } from "../../plugin-nodes/apply.ts";
import { DesignApplyResultSchema } from "../../schemas/dsl.ts";
import type { DesignApplyResult, DslIssue, DslResult } from "../../types/dsl.ts";
import type { AgentPort } from "../../types/framer.ts";
import type { AuditIssue } from "../../types/layout-audit.ts";
import type { OperationContext } from "../../types/operations.ts";
import type { XmlCompiled } from "../../types/xml.ts";
import { errorMessage } from "../../utils/errors.ts";
import { previewImagesIn } from "../../utils/text.ts";
import { withinTime } from "../../utils/time.ts";
import { resolveKeyReferences } from "../../xml/xml-keys.ts";
import { xmlToDsl } from "../../xml/xml-to-dsl.ts";
import { defineOperation } from "../define.ts";
import { auditTouched } from "./audit-touched.ts";
import { fractionalPxWarnings } from "./fractional-px.ts";
import { projectIconControlWarnings } from "./icon-controls.ts";
import { resolveVariableIds } from "./variable-ids.ts";
import { loadVariableTargets } from "./variable-targets.ts";

export const designApply = defineOperation({
  name: "design.apply",
  // Raw DSL may delete nodes, and re-sending a batch after a lost session could duplicate added nodes.
  effect: "destructive",
  idempotent: false,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    xml: z
      .string()
      .min(1)
      .max(200_000)
      .exactOptional()
      .describe(
        'Nodes as XML, e.g. <FrameNode parent="<id>" key="hero" layout="stack"><RichTextNode>Hi</RichTextNode></FrameNode>. Without id: created (key names it in the answer); with id: SET of the attributes given; $delete="true" deletes.',
      ),
    dsl: z
      .string()
      .min(1)
      .max(200_000)
      .exactOptional()
      .describe(
        'Framer DSL commands, each ending with ";", applied after the XML. See framer_docs "Updating the Project".',
      ),
    pagePath: z.string().startsWith("/").default("/").describe("Page the commands apply to."),
  }),
  output: DesignApplyResultSchema,
  async run(context, input) {
    const result = await applyBatch(context, input);

    // A failed or slow audit only loses its findings: the batch is applied.
    return result.ok && input.xml !== undefined
      ? withAudit(
          result,
          await withinTime(
            auditTouched(context.runtime, input.xml, input.pagePath, result.keys ?? {}),
            AUDIT_AFTER_APPLY_MS,
            [],
          ).catch(() => []),
        )
      : result;
  },
  refused(output) {
    return output.ok ? null : output.message;
  },
  // The chips show which nodes changed; the panel adds the images the batch put in.
  describe({ xml, dsl, pagePath }) {
    return {
      subject: pagePath === "/" ? null : pagePath,
      images: previewImagesIn(`${xml ?? ""}\n${dsl ?? ""}`),
    };
  },
});

async function applyBatch(
  context: OperationContext,
  { xml, dsl, pagePath }: { readonly xml?: string; readonly dsl?: string; readonly pagePath: string },
): Promise<DesignApplyResult> {
  const { runtime, history } = context;

  // Without framer.agent (no Server API key) the XML goes through the Plugin API: frames, text and their layout.
  if (runtime.agent === null) {
    if (dsl !== undefined) {
      throw new OperationError(
        "UNSUPPORTED_TRANSPORT",
        "Raw DSL needs framer.agent, which comes with a Server API key.",
        "Use xml: without a key it creates frames and plain text and sets their layout, size, fill, radius, border and text style.",
      );
    }

    if (xml === undefined) {
      throw new OperationError("INVALID_INPUT", "Nothing to apply.", "Pass xml.");
    }

    return applyXmlWithPluginApi(context, xml, pagePath);
  }

  const agent = runtime.agent;
  const compiled = xml === undefined ? null : xmlToDsl(xml, (base) => nextTempId(runtime, base));
  const commands = deferAbsoluteCentering(
    deferIconInitialValues(
      joinCommands([
        ...(compiled?.commands ?? []),
        ...(dsl === undefined ? [] : [resolveKeyReferences(dsl, compiled?.keys ?? {})]),
      ]),
    ),
  );

  if (commands.trim() === "") {
    throw new OperationError("INVALID_INPUT", "Nothing to apply.", "Pass xml, dsl or both.");
  }

  const parsed = parseDsl(commands);
  // The reads around applyChanges only help: none may fail the batch. After it, a failure would make the model retry a
  // batch Framer applied already, and design_apply is not idempotent.
  const variables = await loadVariableTargets(agent, pagePath, parsed).catch(() => new Set<string>());
  const apply = async () => {
    try {
      return normalizeDslResult(await agent.applyChanges(commands, { pagePath }));
    } catch (error) {
      const refused = assetFailureResult(errorMessage(error));

      if (refused === null) {
        throw error;
      }

      return refused;
    }
  };
  const applied =
    history === undefined
      ? await apply()
      : await withDslHistory(
          {
            history,
            agent,
            pagePath,
            dsl: commands,
            variables,
          },
          apply,
        );
  const iconWarnings = await projectIconControlWarnings(agent, pagePath, parsed, applied.renamedIds).catch(() => []);
  const result = withWarnings(applied, [...iconWarnings, ...fractionalPxWarnings(parsed, applied.renamedIds)]);

  return compiled === null ? result : withKeys(result, compiled, commands, agent, pagePath);
}

function withAudit(result: DesignApplyResult, audit: readonly AuditIssue[]): DesignApplyResult {
  return audit.length === 0
    ? result
    : {
        ...result,
        audit: [...audit],
      };
}

function withWarnings(result: DslResult, warnings: readonly DslIssue[]): DslResult {
  return warnings.length === 0
    ? result
    : {
        ...result,
        warnings: [...result.warnings, ...warnings],
      };
}

/**
 * What XML callers need back: real ids by their keys, variables' too (looked up, Framer does not report them), and the
 * generated DSL when Framer rejected part of it.
 */
async function withKeys(
  result: DslResult,
  compiled: XmlCompiled,
  commands: string,
  agent: AgentPort,
  pagePath: string,
) {
  let variableIds: Record<string, string> = {};
  let warnings = result.warnings;

  try {
    variableIds = await resolveVariableIds(agent, pagePath, compiled.variables, result.renamedIds);
  } catch (error) {
    warnings = [
      ...warnings,
      {
        message: `The ids of the new variables could not be looked up (${errorMessage(error)}), so their keys show temp ids: read the component with nodes_read for the real ones.`,
        targets: [],
      },
    ];
  }

  const renamedIds = {
    ...result.renamedIds,
    ...variableIds,
  };
  const keys = Object.fromEntries(
    Object.entries(compiled.keys).map(([key, tempId]) => [key, renamedIds[tempId] ?? tempId]),
  );

  return {
    ...result,
    warnings,
    renamedIds,
    keys,
    ...(result.ok ? {} : { dsl: commands }),
  };
}
