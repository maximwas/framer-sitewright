import type { QUERY_OPERATORS } from "../constants/nodes.ts";

export type QueryOperator = (typeof QUERY_OPERATORS)[number];

/** One condition of nodes_query on a layer's DSL attribute. */
export interface QueryCondition {
  readonly attribute: string;
  readonly op: QueryOperator;
  readonly value?: string;
}
