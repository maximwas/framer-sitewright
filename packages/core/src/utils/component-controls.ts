import { isPlainObject } from "./guards.ts";

/**
 * readComponentControls as the component really is. Framer's answer keeps an old name for a variant renamed after it
 * was created ("Variant 3" for "Slide 3", which $control__variant then refuses), lists an option variable as an enum
 * without its values, and names types the agent cannot use as written; the component node itself has the truth.
 */
export function withComponentFacts(controls: unknown, node: unknown): unknown {
  if (!isPlainObject(controls) || !isPlainObject(controls.controls) || !isPlainObject(node)) {
    return controls;
  }

  // A hover or pressed variant carries its base's name: each name is one option.
  const variants = [
    ...new Set(
      Array.isArray(node.$variants)
        ? node.$variants.flatMap((variant) =>
            isPlainObject(variant) && typeof variant.name === "string" ? [variant.name] : [],
          )
        : [],
    ),
  ];
  const variables = new Map(
    (Array.isArray(node.variables) ? node.variables : []).flatMap((variable) =>
      isPlainObject(variable) && typeof variable.key === "string" ? [[variable.key, variable] as const] : [],
    ),
  );

  return {
    ...controls,
    controls: Object.fromEntries(
      Object.entries(controls.controls).map(([key, control]) => [
        key,
        key === "$control__variant" && variants.length > 0 && isPlainObject(control)
          ? {
              ...control,
              options: variants,
            }
          : withVariable(key, control, variables.get(key)),
      ]),
    ),
  };
}

function withVariable(key: string, control: unknown, variable: Readonly<Record<string, unknown>> | undefined): unknown {
  if (!isPlainObject(control) || variable === undefined) {
    return control;
  }

  const type = variable.type === "image" ? "image" : variable.type === "color" ? "color" : control.type;

  return {
    ...control,
    type,
    ...(typeof variable.name === "string" ? { name: variable.name } : {}),
    ...(Array.isArray(variable.cases) ? { options: variable.cases } : {}),
    // An image's initial value is an asset reference, of no use to write back.
    ...(variable.initialValue === undefined || control.defaultValue !== undefined || type === "image"
      ? {}
      : { defaultValue: variable.initialValue }),
    ...(type === "image" ? { write: `${key}.src="<image url>" ${key}.alt="<alt text>"` } : {}),
  };
}
