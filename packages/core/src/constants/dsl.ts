/** A node id the DSL accepts: Framer ids and temp ids. */
export const DSL_ID_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_:./-]*$/;

/** An attribute name the DSL accepts, dotted paths included (breakpoint.medium.fontSize). */
export const DSL_KEY_PATTERN = /^[A-Za-z$_][A-Za-z0-9$_.-]*$/;

/** The head of a DSL command: `+Type id` or `VERB id`, then the attributes. */
export const DSL_COMMAND_HEAD = /^(?:\+([A-Za-z]+)|([A-Z][A-Z_]*))\s+(\S+)\s*([\s\S]*)$/;

/** One `key="value"` attribute; `\"` escapes a quote inside the value. */
export const DSL_ATTRIBUTE = /([A-Za-z$_][\w$.-]*)="((?:[^"\\]|\\"|\\(?!"))*)"/g;

/** The verbs of the DSL grammar besides `+Type` (framer_docs, "Command Syntax"). */
export const DSL_VERBS = ["SET", "DEL", "MOVE", "DUPE", "CREATE_VARIANT"] as const;

/** What a canvas node id Framer assigns looks like (e.g. F8LWSlM2C); compound ids append one to a variant id. */
export const FRAMER_NODE_ID = /^[A-Za-z0-9_-]{9}$/;

/** An `initialValue="…"` attribute with its leading space, the quoted value kept as written. */
export const DSL_INITIAL_VALUE = /\s+initialValue=("(?:[^"\\]|\\"|\\(?!"))*")/;

/** A px length with a fraction, e.g. `569.15px`: designs use whole pixels, so a fraction is flagged. */
export const FRACTIONAL_PX = /(?<![\w.])-?\d+\.\d+px\b/;

/** Node types of variables (`+Variable`, `+IconVariable`, `+LinkVariable`…): their ids never come back in renamedIds. */
export const DSL_VARIABLE_TYPE = /Variable$/;

/** The axes an absolute layer can be centred on: its anchor, and the pins that must stay unset for it to centre. */
export const CENTERING_AXES = [
  {
    anchor: "centerAnchorX",
    pins: ["left", "right"],
  },
  {
    anchor: "centerAnchorY",
    pins: ["top", "bottom"],
  },
] as const;

/** The temporary pin a centred absolute layer is created with: Framer refuses one without any pin. */
export const DSL_PIN_PLACEHOLDER = "0px";

/** The prefix of a component control written on an instance (`$control__icon="Heart"`). */
export const DSL_CONTROL_PREFIX = "$control__";

/** A value bound to a variable or token, not given literally. */
export const DSL_VAR_REFERENCE = /^var\(/;

/** Node types of variables (`+Variable`, `+IconVariable`, `+ArrayVariable`…): not canvas nodes, and undo keeps them. */
export const VARIABLE_NODE_TYPE = /Variable$/;

/** An attribute inside a list item: `styleTransformEffect.sections.0.opacity`, `$control__slides.1`. */
export const DSL_LIST_ITEM_KEY = /\.\d+(?:\.|$)/;
