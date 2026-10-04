import { TEXT_CONTENT_TYPES } from "../constants/history.ts";
import { XML_TEXT_ATTRIBUTE_TYPES } from "../constants/xml.ts";
import type { XmlChild, XmlElementNode, XmlParent } from "../types/xml.ts";
import { positionalChildId } from "../utils/text-ids.ts";
import { invalidXml } from "./xml-errors.ts";

/** A block or run with neither id nor key, inside an existing rich text: the one at that position. */
export function existingContentId(element: XmlElementNode, parent: XmlParent | null, position: number): string | null {
  const insideText = parent !== null && (parent.type === "RichTextNode" || TEXT_CONTENT_TYPES.has(parent.type));

  if (!insideText || parent.isNew || element.props.key !== undefined || !TEXT_CONTENT_TYPES.has(element.type)) {
    return null;
  }

  return positionalChildId(parent.id, position);
}

/**
 * The `text` attribute an element's text sets, or null. Only a rich text and a run take text; text mixed with
 * elements fails, since which part is which run would be a guess.
 */
export function textAttribute(element: XmlElementNode): string | null {
  const texts = element.children.filter((child) => child.kind === "text");

  if (texts.length === 0) {
    return null;
  }

  if (!XML_TEXT_ATTRIBUTE_TYPES.has(element.type)) {
    throw invalidXml(texts[0] ?? element, `Text cannot go inside ${element.type}: put it in a <RichTextNode>.`);
  }

  if (texts.length !== element.children.length) {
    throw invalidXml(element, "Text and elements are mixed: put them in a <TextBlock>, styled parts as <TextRun>.");
  }

  return texts.map((text) => text.value).join("");
}

/** Text split by a comment is still one run. */
export function joinAdjacentText(children: readonly XmlChild[]): XmlChild[] {
  return children.reduce<XmlChild[]>((joined, child) => {
    const previous = joined.at(-1);

    if (child.kind === "text" && previous?.kind === "text") {
      joined[joined.length - 1] = {
        ...previous,
        value: previous.value + child.value,
      };
    } else {
      joined.push(child);
    }

    return joined;
  }, []);
}
