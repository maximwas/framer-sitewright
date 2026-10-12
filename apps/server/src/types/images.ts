/** An image as 8-bit RGBA, row by row. */
export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

/** How the edges along one axis of two images pair up, by position in px. */
export interface EdgeDiff {
  readonly matched: number;
  /** An edge of the reference found nearby in the node: where each is, and by how much the node's is off. */
  readonly shifted: readonly { readonly reference: number; readonly node: number; readonly by: number }[];
  /** Edges of the reference with none near them in the node. */
  readonly missing: readonly number[];
  /** Edges of the node with none near them in the reference. */
  readonly extra: readonly number[];
}
