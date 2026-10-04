import { LAYOUT_AUDIT_DEPTH } from "../../constants/layout-audit.ts";
import { auditContext, auditTree, rankIssues } from "../../layout-audit/audit.ts";
import type { FramerRuntime } from "../../types/framer.ts";
import type { AuditIssue } from "../../types/layout-audit.ts";
import { parseXml } from "../../xml/parse-xml.ts";
import { readNodeTree } from "../nodes/read-tree.ts";

/**
 * Audits what an XML batch touched: each top-level element's node, or for a new one the parent it went into, so the
 * new nodes are checked together with their siblings.
 */
export async function auditTouched(
  runtime: FramerRuntime,
  xml: string,
  pagePath: string,
  keys: Readonly<Record<string, string>>,
): Promise<AuditIssue[]> {
  const roots = new Set<string>();

  for (const element of parseXml(xml)) {
    if (element.kind !== "element") {
      continue;
    }

    const { id, parent } = element.props;
    const target = id ?? parent;
    const real = target?.startsWith("@") ? keys[target.slice(1)] : target;

    if (real !== undefined) {
      roots.add(real);
    }
  }

  const [context, trees] = await Promise.all([
    auditContext(runtime.port),
    Promise.all([...roots].map((root) => readNodeTree(runtime, root, LAYOUT_AUDIT_DEPTH, pagePath))),
  ]);

  return rankIssues(trees.flatMap((tree) => (tree === null ? [] : auditTree(tree, context))));
}
