import { VIRTUAL_TEXT_ID } from "../constants/history.ts";
import { LINK_STYLE_REFERENCE, TEXT_STYLE_REFERENCE } from "../constants/styles-usage.ts";
import { serializedList } from "../history/dsl/serialized.ts";
import type { SerializedNode } from "../types/dsl.ts";
import type { NamedStyle, ScopeUsage, StyleUsage } from "../types/styles-usage.ts";
import { tokenIdsIn } from "../utils/link-styles.ts";
import { normalizeAssetPath } from "./asset-path.ts";

/**
 * Finds a style by what a layer names it: its id, its path (layers write a text or link style by its name, which is the
 * path), or its last segment when no other style shares that.
 */
export class StyleNames {
  readonly #ids = new Map<string, string>();

  constructor(styles: readonly NamedStyle[]) {
    const leaves = new Map<string, string[]>();

    for (const { id, path } of styles) {
      const leaf = path.split("/").at(-1) ?? path;

      this.#ids.set(id, id);
      this.#ids.set(path, id);
      leaves.set(leaf, [...(leaves.get(leaf) ?? []), id]);
    }

    for (const [leaf, [id, ...others]] of leaves) {
      if (id !== undefined && others.length === 0 && !this.#ids.has(leaf)) {
        this.#ids.set(leaf, id);
      }
    }
  }

  find(name: unknown): string | undefined {
    if (typeof name !== "string" || name.replaceAll("/", "").trim() === "") {
      return undefined;
    }

    return this.#ids.get(name) ?? this.#ids.get(normalizeAssetPath(name));
  }
}

/**
 * Which layers use each token and style, and where. A layer counts once however many breakpoints or variants copy it
 * (a copy names its original as `$originalId`), and a text's blocks and runs count as the text itself.
 */
export class UsageTally {
  readonly #tokens: ReadonlySet<string>;
  readonly #texts: StyleNames;
  readonly #links: StyleNames;
  readonly #layers = new Map<string, Set<string>>();
  readonly #usedIn = new Map<string, Set<string>>();

  constructor(tokens: ReadonlySet<string>, texts: StyleNames, links: StyleNames) {
    this.#tokens = tokens;
    this.#texts = texts;
    this.#links = links;
  }

  /** One scope's answers: Framer's own list of what it uses, and its layers, read for what each names. */
  add({ label, references, layers }: ScopeUsage): void {
    for (const { id } of serializedList(references)) {
      this.#use(id, label, null);
    }

    const nodes = serializedList(layers);
    const originals = new Map(nodes.map((node) => [node.id, node.$originalId ?? node.id]));

    for (const node of nodes) {
      const owner = VIRTUAL_TEXT_ID.exec(node.id)?.[1] ?? node.id;
      const layer = `${label}\n${originals.get(owner) ?? owner}`;

      for (const id of this.#referencesOf(node)) {
        this.#use(id, label, layer);
      }
    }
  }

  usage(style: NamedStyle): StyleUsage {
    return {
      id: style.id,
      path: style.path,
      layers: this.#layers.get(style.id)?.size ?? 0,
      usedIn: [...(this.#usedIn.get(style.id) ?? [])],
    };
  }

  #use(id: string, label: string, layer: string | null): void {
    this.#usedIn.set(id, (this.#usedIn.get(id) ?? new Set()).add(label));

    if (layer !== null) {
      this.#layers.set(id, (this.#layers.get(id) ?? new Set()).add(layer));
    }
  }

  /** The tokens a node's values bind and the text and link styles it names. */
  #referencesOf(node: SerializedNode): Set<string> {
    const attributes = node.attributes ?? {};
    const { children: _children, ...own } = node;
    const found = new Set(tokenIdsIn(JSON.stringify(own)).filter((id) => this.#tokens.has(id)));

    for (const [key, value] of Object.entries(attributes)) {
      const id = TEXT_STYLE_REFERENCE.test(key)
        ? this.#texts.find(value)
        : key === LINK_STYLE_REFERENCE
          ? this.#links.find(value)
          : undefined;

      if (id !== undefined) {
        found.add(id);
      }
    }

    return found;
  }
}

/** Used items first, the most used first; unused ones by path. */
export function splitByUse<T extends StyleUsage>(
  items: readonly T[],
  used: (item: T) => boolean,
): { used: T[]; unused: string[] } {
  const byPath = (a: T, b: T) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

  return {
    used: items.filter(used).sort((a, b) => b.layers - a.layers || byPath(a, b)),
    unused: items
      .filter((item) => !used(item))
      .sort(byPath)
      .map(({ path }) => path),
  };
}
