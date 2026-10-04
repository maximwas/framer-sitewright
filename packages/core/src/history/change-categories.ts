import {
  ANIMATION_ATTRIBUTES,
  CHANGE_CATEGORIES,
  COLOR_ATTRIBUTES,
  COMPONENT_NODE_TYPES,
  LAYOUT_ATTRIBUTES,
  TEXT_ATTRIBUTES,
} from "../constants/history.ts";
import type { ChangeCategory, NodeStep, UndoStep } from "../types/history.ts";

/**
 * What an entry changed, by kind: each step counts once in every category it touches (a new frame with an appear
 * effect is a block and an animation). Categories come in a fixed order, which is also their priority for a chip.
 */
export function categoriesOf(steps: readonly UndoStep[]): { category: ChangeCategory; count: number }[] {
  const counts = new Map<ChangeCategory, number>();

  for (const step of steps) {
    for (const category of stepCategories(step)) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  return CHANGE_CATEGORIES.flatMap((category) => {
    const count = counts.get(category);

    return count === undefined
      ? []
      : [
          {
            category,
            count,
          },
        ];
  });
}

/** What one item went through across its steps, in the fixed order: the first is the chip's color. */
export function itemCategories(steps: readonly UndoStep[]): ChangeCategory[] {
  const found = new Set(steps.flatMap((step) => [...stepCategories(step)]));

  return CHANGE_CATEGORIES.filter((category) => found.has(category));
}

function stepCategories(step: UndoStep): Set<ChangeCategory> {
  return step.kind === "node" ? nodeCategories(step) : styleCategories(step);
}

function styleCategories(step: UndoStep): Set<ChangeCategory> {
  return new Set([step.kind === "color-style" ? "colors" : "styles"]);
}

function nodeCategories(step: NodeStep): Set<ChangeCategory> {
  const categories = new Set<ChangeCategory>();
  const state = step.after ?? step.before;
  const keys = new Set([...Object.keys(step.before?.attributes ?? {}), ...Object.keys(step.after?.attributes ?? {})]);

  if (COMPONENT_NODE_TYPES.has(step.type) || state?.nodes.some((node) => node.replicaOf !== null)) {
    categories.add("components");
  }

  if (step.change === "moved") {
    categories.add("layout");
  }

  if (step.change !== "updated" && !categories.has("components")) {
    categories.add(step.type === "RichTextNode" ? "text" : "layout");
  }

  if ((step.before?.nodes.length ?? 0) > 0 || (step.after?.nodes.length ?? 0) > 0) {
    categories.add("text");
  }

  for (const key of keys) {
    categories.add(attributeCategory(key));
  }

  return categories;
}

function attributeCategory(key: string): ChangeCategory {
  const root = key.split(".")[0] ?? key;

  if (ANIMATION_ATTRIBUTES.has(root)) {
    return "animations";
  }

  if (COLOR_ATTRIBUTES.has(root)) {
    return "colors";
  }

  if (TEXT_ATTRIBUTES.has(root)) {
    return "text";
  }

  if (LAYOUT_ATTRIBUTES.has(root)) {
    return "layout";
  }

  return root === "component" || root.startsWith("$control__") ? "components" : "settings";
}
