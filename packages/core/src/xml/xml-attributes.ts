import { XML_ELEMENT_KEYS, XML_READ_ONLY_PROPS } from "../constants/xml.ts";
import type { XmlElementNode } from "../types/xml.ts";
import { invalidXml } from "./xml-errors.ts";

/** An element's attributes as DSL attributes: read-only ones dropped, so a read tree can be sent back. */
export function attributesOfElement(element: XmlElementNode, omit: readonly string[] = []): Record<string, string> {
  return Object.fromEntries(
    Object.entries(element.props).filter(
      ([key]) => !XML_ELEMENT_KEYS.has(key) && !XML_READ_ONLY_PROPS.has(key) && !omit.includes(key),
    ),
  );
}

/** An attribute the writer reads itself, such as `id` or `key`: non-empty if given. */
export function ownProp(element: XmlElementNode, name: string): string | null {
  const value = element.props[name];

  if (value === undefined) {
    return null;
  }

  if (value === "") {
    throw invalidXml(element, `${name}="" is empty.`);
  }

  return value;
}
