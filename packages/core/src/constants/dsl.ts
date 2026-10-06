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

/**
 * Framer applies every command of a batch it can and skips the failed ones: re-sending the whole batch would create
 * its nodes a second time.
 */
export const DSL_PARTIAL_APPLY_HINT =
  "Framer applied every command without an error; only the failed commands were skipped. Send only the failed commands again, fixed, with the real ids from renamedIds and keys for nodes this batch created: the whole batch again would create them twice.";

/** Framer's refusal when it cannot download an image URL of a batch; nothing of the batch is applied then. */
export const DSL_ASSET_FAILURE = /Assets upload from URL (\S+) to \S+ failed\.?\s*(.*)/is;

/**
 * The transitions where Framer keeps spring-physics: scroll transforms and page transitions (a spring-duration written
 * on a page transition is ignored, on a scroll transform it becomes Framer's 500 60 1). Everywhere else, variants,
 * appear, hover, press, loop, flow, text effects and overlays, it keeps only spring-duration and turns a written
 * spring-physics into its default 0.4s with bounce 0.2, or 0s on an overlay's backdrop (seen 06.10.2026).
 */
export const PHYSICS_TRANSITIONS = /^(?:styleTransformEffect|pageEffects)\./;

export const SPRING_PHYSICS = /^spring-physics\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s+(-?[\d.]+)s?)?\s*$/;

export const SPRING_DURATION = /^spring-duration\s+([\d.]+)s?\s+([\d.]+)(?:\s+(-?[\d.]+)s?)?\s*$/;

/** Framer's time springs end when the motion is this close to its target (framer-motion's safeMin). */
export const SPRING_REST = 0.001;

/** A critically damped spring is within SPRING_REST of its target after this many radians: e^-x (1 + x) = 0.001. */
export const CRITICAL_SETTLE_RADIANS = 9.233;

/** Time springs are written to the nearest 0.05 s. */
export const SPRING_DURATION_STEP_S = 0.05;

/** The attributes that hold a transition: a node's, an effect's (`*.transition`) and an overlay backdrop's. */
export const TRANSITION_ATTRIBUTE = /^(?:transition|.+\.transition|backdrop\.(?:enter|exit))$/;
