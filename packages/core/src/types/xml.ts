/** Where something starts in the XML source, for error messages. Lines and columns count from 1. */
export interface XmlLocation {
  readonly line: number;
  readonly column: number;
}

export interface XmlElementNode extends XmlLocation {
  readonly kind: "element";
  readonly type: string;
  /** Attribute values with entities decoded. XML has only strings, like the DSL. */
  readonly props: Readonly<Record<string, string>>;
  readonly children: readonly XmlChild[];
}

/** Text between tags, entities decoded, with indentation whitespace already dropped. */
export interface XmlTextNode extends XmlLocation {
  readonly kind: "text";
  readonly value: string;
}

export type XmlChild = XmlElementNode | XmlTextNode;

/** XML translated to DSL. `keys` maps each element's `key` to the temp id it got. */
export interface XmlCompiled {
  readonly commands: readonly string[];
  readonly keys: Readonly<Record<string, string>>;
  /** Variables created under a key: Framer leaves them out of renamedIds, so their ids are looked up afterwards. */
  readonly variables: readonly XmlVariable[];
}

/** A variable the batch creates, with what finds it again in its scope: the name. */
export interface XmlVariable {
  readonly key: string;
  readonly tempId: string;
  readonly name: string;
  /** The scope node as the DSL got it: a real id, or a temp id from the same batch. */
  readonly scope: string;
}

/** Where an element's children go: an existing node, or one the same batch creates. */
export interface XmlParent {
  readonly id: string;
  readonly type: string;
  readonly isNew: boolean;
}

/** One position in the printed tree: the parent's id prefixes positional ids of rich text content. */
export interface XmlPrintPlace {
  readonly parentId: string | null;
  readonly index: number;
  readonly depth: number;
}
