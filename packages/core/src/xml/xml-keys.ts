import { XML_KEY_PATTERN, XML_KEY_REFERENCE } from "../constants/xml.ts";
import type { XmlChild } from "../types/xml.ts";
import { invalidXml } from "./xml-errors.ts";

/**
 * Every `key` in the tree with its temp id, given up front: `@key` may then point at an element created further down
 * the batch, or in the dsl that runs after it.
 */
export function assignKeys(roots: readonly XmlChild[], nextTempId: (base: string) => string): Record<string, string> {
  const keys: Record<string, string> = {};
  const visit = (child: XmlChild) => {
    if (child.kind === "text") {
      return;
    }

    const key = child.props.key;

    if (key !== undefined) {
      if (!XML_KEY_PATTERN.test(key) || key in keys) {
        throw invalidXml(child, `key "${key}" must be unique in the batch, made of letters, digits and _.`);
      }

      keys[key] = nextTempId(key);
    }

    child.children.forEach(visit);
  };

  roots.forEach(visit);

  return keys;
}

/** `@key` → the key's temp id. A name that is no key stays as written, so an e-mail address is left alone. */
export function resolveKeyReferences(value: string, keys: Readonly<Record<string, string>>): string {
  return value.replace(XML_KEY_REFERENCE, (reference, key: string) => keys[key] ?? reference);
}
