import * as z from "zod";
import { TOKEN_REFERENCE } from "../../constants/history.ts";
import { OperationError } from "../../errors.ts";
import { borderFromShorthand } from "../../utils/border.ts";
import { isPlainObject } from "../../utils/guards.ts";
import { defineOperation } from "../define.ts";

/**
 * Adds a border-type variable to a project component: the control an instance's border is set by, per side too. The
 * DSL refuses that variable type (seen 12.10.2026); the Server API's ComponentNode.addVariables makes it. A new
 * variable reaches the DSL session only after it reconnects, which design_apply does after "could not be found".
 */
export const componentBorderVariableAdd = defineOperation({
  name: "components.addBorderVariable",
  effect: "write",
  idempotent: false,
  // Server API only: the plugin's API has no addVariables, so it never runs there and declares no plugin permission.
  needsAgent: true,
  permissions: [],
  input: z.strictObject({
    componentId: z.string().min(1).describe("The component (ComponentNode) to add it to, from components_read."),
    name: z.string().min(1).describe('The control\'s name in the panel and on instances, e.g. "Border".'),
    default: z
      .string()
      .default("1px solid rgb(0, 0, 0)")
      .describe(
        'Its default: "1px solid <color>", or per side in CSS order "0 0 1px 0 solid <color>"; the color may be var(--token-<id>).',
      ),
  }),
  output: z.object({
    componentId: z.string(),
    variableId: z.string(),
    name: z.string(),
    /** What binds the variable to a frame's border with design_apply: SET <variant frame> <bind>. */
    bind: z.string(),
  }),
  async run({ runtime, history }, { componentId, name, default: shorthand }) {
    const component = await runtime.port.getNode(componentId);

    if (!isPlainObject(component) || typeof component.addVariables !== "function") {
      throw new OperationError(
        "NOT_FOUND",
        `No component has the id "${componentId}".`,
        "Take a project component's id from components_read.",
      );
    }

    const border = borderFromShorthand(shorthand);

    if (border === null) {
      throw new OperationError(
        "INVALID_INPUT",
        `"${shorthand}" is not a border.`,
        'Write it as "1px solid <color>", or per side as "0 0 1px 0 solid <color>".',
      );
    }

    const widths =
      typeof border.borderWidth === "number"
        ? `${border.borderWidth}px`
        : [border.borderTopWidth, border.borderRightWidth, border.borderBottomWidth, border.borderLeftWidth]
            .map((width) => `${String(width)}px`)
            .join(" ");
    const color = String(border.borderColor ?? "rgb(0, 0, 0)");
    const tokenId = [...color.matchAll(TOKEN_REFERENCE)][0]?.[1];
    const token =
      tokenId === undefined ? undefined : (await runtime.port.getColorStyles()).find((style) => style.id === tokenId);

    if (tokenId !== undefined && token === undefined) {
      throw new OperationError(
        "TOKEN_NOT_FOUND",
        `No color token has the id ${tokenId}.`,
        "List them with color_tokens_list.",
      );
    }

    const [variable]: unknown[] = await component.addVariables.call(component, [
      {
        type: "border",
        name,
        defaultValue: {
          width: widths,
          style: border.borderStyle ?? "solid",
          // A token goes as its color style, so the default stays bound to it.
          color: token ?? color,
        },
      },
    ]);

    if (!isPlainObject(variable) || typeof variable.id !== "string") {
      throw new OperationError("WRITE_FAILED", "Framer did not return the new variable.");
    }

    history?.markIncomplete(`Variable ${name} added to a component: undo does not remove component variables.`);

    return {
      componentId,
      variableId: variable.id,
      name,
      bind: `border="var(--variable-${variable.id})"`,
    };
  },
  describe({ name }, { componentId }) {
    return {
      subject: name,
      nodes: [
        {
          id: componentId,
          name: componentId,
        },
      ],
    };
  },
});
