import { IMAGE_CONTROL_KEYS } from "../constants/assets.ts";
import { CANVAS_COMPONENT_ID, FONT_SELECTOR } from "../constants/components.ts";
import { DSL_CONTROL_PREFIX } from "../constants/dsl.ts";
import { TOKEN_REFERENCE } from "../constants/history.ts";
import type { ComponentVariableInfo } from "../types/components.ts";
import type { ControlledNode, FramerPort } from "../types/framer-port.ts";
import { isPlainObject } from "./guards.ts";

/** A component instance whose control values setAttributes can change. */
export function isControlledNode(node: unknown): node is ControlledNode {
  return (
    typeof node === "object" &&
    node !== null &&
    "controls" in node &&
    isPlainObject(node.controls) &&
    "setAttributes" in node &&
    typeof node.setAttributes === "function"
  );
}

/**
 * The instance's controls with `patch` applied. An object control (a code component's arrows or dots) merges with its
 * current value, so a patch of one field keeps the others; anything else replaces the value.
 */
export function mergeControls(
  current: Readonly<Record<string, unknown>>,
  patch: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return Object.fromEntries([
    ...Object.entries(current),
    ...Object.entries(patch).map(([key, value]) => {
      const previous = current[key];

      return [
        key,
        isPlainObject(value) && isPlainObject(previous)
          ? {
              ...previous,
              ...value,
            }
          : value,
      ];
    }),
  ]);
}

/** Whether a control holds the value written: objects compare by their fields, in any order. */
export function holdsValue(stored: unknown, written: unknown): boolean {
  return JSON.stringify(sortedKeys(stored)) === JSON.stringify(sortedKeys(written)) || holdsFont(stored, written);
}

/**
 * A font control is written by its selector ("GF;Urbanist-regular") and read back by family, weight and style, so it
 * holds the font written when the families match.
 */
function holdsFont(stored: unknown, written: unknown): boolean {
  if (!isPlainObject(stored) || !isPlainObject(written) || typeof written["fontSelector"] !== "string") {
    return false;
  }

  const family = FONT_SELECTOR.exec(written["fontSelector"])?.[1];

  return (
    family !== undefined &&
    typeof stored["fontFamily"] === "string" &&
    stored["fontFamily"].toLowerCase() === family.toLowerCase()
  );
}

function sortedKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortedKeys);
  }

  return isPlainObject(value)
    ? Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, sortedKeys(value[key])]),
      )
    : value;
}

/**
 * The controls with every image URL in an image field uploaded first: Framer keeps only an uploaded image there (an
 * ImageAsset) and drops a URL silently. A field that is not an image field keeps its text, URL or not.
 */
export async function withUploadedImages(
  controls: Readonly<Record<string, unknown>>,
  upload: (url: string, alt: string | null) => Promise<unknown>,
): Promise<Record<string, unknown>> {
  const visit = async (value: unknown, imageField: boolean): Promise<unknown> => {
    if (imageField && typeof value === "string" && /^https?:\/\//.test(value)) {
      return upload(value, null);
    }

    if (imageField && isPlainObject(value) && typeof value.url === "string" && !("id" in value)) {
      return upload(value.url, typeof value.alt === "string" ? value.alt : null);
    }

    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => visit(item, imageField)));
    }

    if (isPlainObject(value)) {
      return Object.fromEntries(
        await Promise.all(
          Object.entries(value).map(async ([key, item]) => [key, await visit(item, IMAGE_CONTROL_KEYS.has(key))]),
        ),
      );
    }

    return value;
  };

  return (await visit(controls, false)) as Record<string, unknown>;
}

/**
 * The variables of the project component an instance is of; none for a code component, an external one, or when they
 * cannot be read. Its instances key their controls by variable id.
 */
export async function componentVariablesOf(port: FramerPort, node: unknown): Promise<ComponentVariableInfo[]> {
  const identifier =
    isPlainObject(node) && typeof node.componentIdentifier === "string" ? node.componentIdentifier : "";
  const componentId = CANVAS_COMPONENT_ID.exec(identifier)?.[1];

  if (componentId === undefined) {
    return [];
  }

  try {
    const component = await port.getNode(componentId);

    if (!isPlainObject(component) || typeof component.getVariables !== "function") {
      return [];
    }

    const variables: unknown = await component.getVariables.call(component);

    return Array.isArray(variables)
      ? variables.flatMap((variable) =>
          isPlainObject(variable) && typeof variable.id === "string"
            ? [
                {
                  id: variable.id,
                  name: typeof variable.name === "string" ? variable.name : variable.id,
                  type: typeof variable.type === "string" ? variable.type : "",
                },
              ]
            : [],
        )
      : [];
  } catch {
    return [];
  }
}

/**
 * The key an instance holds a control under: the key as written when the instance has it, else the id of the variable
 * it names, by id, by name ("Border") or as the DSL writes it ("border", "$control__border"), in any case.
 */
export function controlKey(
  key: string,
  controls: Readonly<Record<string, unknown>>,
  variables: readonly ComponentVariableInfo[],
): string {
  if (key in controls) {
    return key;
  }

  const bare = key.startsWith(DSL_CONTROL_PREFIX) ? key.slice(DSL_CONTROL_PREFIX.length) : key;
  const loose = (text: string) => text.replace(/[^a-z0-9]/gi, "").toLowerCase();

  return variables.find((variable) => variable.id === bare || loose(variable.name) === loose(bare))?.id ?? bare;
}

/**
 * A written value with each token reference as the token's color: the plugin reads a bound control back resolved
 * (var(--token-…) as rgb), so this is what a stored value is compared with.
 */
export function withTokenColors(
  value: unknown,
  tokens: readonly { readonly id: string; readonly light: string }[],
): unknown {
  if (typeof value === "string") {
    return value.replace(
      TOKEN_REFERENCE,
      (match, id: string) => tokens.find((token) => token.id === id)?.light ?? match,
    );
  }

  if (Array.isArray(value)) {
    return value.map((item) => withTokenColors(item, tokens));
  }

  return isPlainObject(value)
    ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, withTokenColors(item, tokens)]))
    : value;
}
