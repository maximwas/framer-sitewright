import { OperationError } from "../errors.ts";
import type { XmlLocation } from "../types/xml.ts";

export function invalidXml(at: XmlLocation | null, reason: string): OperationError {
  const where = at === null ? "" : ` at line ${at.line}, column ${at.column}`;

  return new OperationError(
    "INVALID_INPUT",
    `Invalid XML${where}: ${reason}`,
    'Tags are node types (<FrameNode>, <RichTextNode>), attributes are DSL attributes in quotes (gap="24px"); write & and < in text as &amp; and &lt;.',
  );
}
