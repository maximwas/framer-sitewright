import { LAYOUT_AUDIT_DEPTH } from "../../constants/layout-audit.ts";
import { auditContext, auditTree, rankIssues } from "../../layout-audit/audit.ts";
import { childrenOf } from "../../layout-audit/tree.ts";
import type { SerializedNode } from "../../types/dsl.ts";
import type { FramerRuntime } from "../../types/framer.ts";
import type { AuditIssue } from "../../types/layout-audit.ts";
import { parseXml } from "../../xml/parse-xml.ts";
import { readNodeTree } from "../nodes/read-tree.ts";

/**
 * Audits what an XML batch touched: each top-level element's node, or for a new one the parent it went into, so the
 * new nodes are checked together with their siblings. A new node put straight into a breakpoint or a page is audited
 * alone: its siblings there are the page's sections, which the batch did not touch.
 */
export async function auditTouched(
  runtime: FramerRuntime,
  xml: string,
  pagePath: string,
  keys: Readonly<Record<string, string>>,
): Promise<AuditIssue[]> {
  const whole = new Set<string>();
  const added = new Map<string, string[]>();

  for (const element of parseXml(xml)) {
    if (element.kind !== "element") {
      continue;
    }

    const { id, parent, key } = element.props;
    const real = (value: string | undefined) => (value?.startsWith("@") ? keys[value.slice(1)] : value);
    const target = real(id ?? parent);
    const created = id === undefined && key !== undefined ? keys[key] : undefined;

    if (target === undefined) {
      continue;
    }

    if (created === undefined) {
      whole.add(target);
    } else {
      added.set(target, [...(added.get(target) ?? []), created]);
    }
  }

  const roots = [...new Set([...whole, ...added.keys()])];
  const [context, trees] = await Promise.all([
    auditContext(runtime.port),
    Promise.all(roots.map((root) => readNodeTree(runtime, root, LAYOUT_AUDIT_DEPTH, pagePath))),
  ]);

  return rankIssues(
    trees.flatMap((tree) => {
      if (tree === null) {
        return [];
      }

      const created = whole.has(tree.id) ? undefined : added.get(tree.id);
      const audited = created !== undefined && isBreakpointOrPage(tree) ? newChildren(tree, created) : [tree];

      return audited.flatMap((node) => auditTree(node, context));
    }),
  );
}

function isBreakpointOrPage(node: SerializedNode): boolean {
  return node.type === "WebPageNode" || (node.$isPrimary ?? false) || (node.$isReplica ?? false);
}

function newChildren(parent: SerializedNode, ids: readonly string[]): SerializedNode[] {
  return childrenOf(parent).filter((child) => ids.includes(child.id));
}
