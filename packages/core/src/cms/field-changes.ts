import { OperationError } from "../errors.ts";
import type { CmsFieldSpec, CmsFieldUpdate } from "../types/cms.ts";
import type { CmsEnumCaseHandle, CmsFieldData, CollectionHandle } from "../types/framer-port.ts";
import { findField } from "./collections.ts";

/** The cases one enum field changes, each checked against the cases it has. */
interface CaseChanges {
  readonly remove: readonly CmsEnumCaseHandle[];
  readonly rename: readonly { readonly option: CmsEnumCaseHandle; readonly name: string }[];
  readonly add: readonly string[];
  /** The names to put first once added and renamed; null keeps Framer's order. */
  readonly first: readonly string[] | null;
}

/** One existing field's changes. */
export interface FieldUpdatePlan {
  readonly field: CmsFieldData;
  readonly name: string | null;
  readonly cases: CaseChanges | null;
}

/** A cms_fields_set call, checked in full before anything is written. */
export interface FieldChangePlan {
  readonly removing: readonly CmsFieldData[];
  readonly updates: readonly FieldUpdatePlan[];
  readonly adding: readonly CmsFieldSpec[];
}

export function planFieldChanges(
  collection: string,
  fields: readonly CmsFieldData[],
  request: {
    readonly add: readonly CmsFieldSpec[];
    readonly remove: readonly string[];
    readonly update: readonly CmsFieldUpdate[];
  },
): FieldChangePlan {
  const removing = unique(request.remove.map((name) => findField(fields, name, collection)));
  const updates = request.update.map((update) => planUpdate(collection, fields, update));

  for (const { field } of updates) {
    if (removing.includes(field)) {
      throw new OperationError("INVALID_INPUT", `${field.name} is both removed and updated in one call.`);
    }

    if (updates.filter((other) => other.field === field).length > 1) {
      throw new OperationError("INVALID_INPUT", `${field.name} is updated twice in one call.`, "Merge its changes.");
    }
  }

  // The fields as they are named once the removals and renames are done: adds and renames must not collide with them.
  const remaining = fields
    .filter((field) => !removing.includes(field))
    .map((field) => ({
      field,
      name: updates.find((update) => update.field === field)?.name ?? field.name,
    }));
  const named = (name: string) => remaining.filter((entry) => entry.name.toLowerCase() === name.trim().toLowerCase());

  for (const { field, name } of updates) {
    const other = name === null ? undefined : named(name).find((entry) => entry.field !== field);

    if (other !== undefined) {
      throw new OperationError(
        "INVALID_INPUT",
        `${collection} already has a field named ${other.name}.`,
        "Rename or remove that one first, or pick another name.",
      );
    }
  }

  const adding = request.add.filter((spec) => {
    const same = named(spec.name)[0];

    if (same !== undefined && same.field.type !== spec.type) {
      throw new OperationError(
        "INVALID_INPUT",
        `${collection} already has a ${same.field.type} field named ${same.name}.`,
        "Remove it first, or pick another name.",
      );
    }

    return same === undefined;
  });

  return {
    removing,
    updates,
    adding,
  };
}

/** Applies one field's rename and case changes; the order of cases last, once their ids are known. */
export async function applyFieldUpdate(collection: CollectionHandle, plan: FieldUpdatePlan): Promise<void> {
  const { field, name, cases } = plan;

  if (name !== null && name !== field.name) {
    await field.setAttributes({ name });
  }

  if (cases === null) {
    return;
  }

  for (const option of cases.remove) {
    await option.remove();
  }

  for (const { option, name: caseName } of cases.rename) {
    await option.setAttributes({ name: caseName });
  }

  for (const caseName of cases.add) {
    await field.addCase?.({ name: caseName });
  }

  if (cases.first !== null) {
    const now = (await collection.getFields()).find(({ id }) => id === field.id)?.cases ?? [];
    const first = cases.first.flatMap((wanted) =>
      now.filter((option) => same(option.name, wanted)).map(({ id }) => id),
    );

    await field.setCaseOrder?.([...first, ...now.map(({ id }) => id).filter((id) => !first.includes(id))]);
  }
}

function planUpdate(collection: string, fields: readonly CmsFieldData[], update: CmsFieldUpdate): FieldUpdatePlan {
  const field = findField(fields, update.field, collection);
  const touchesCases =
    update.addCases !== undefined ||
    update.renameCases !== undefined ||
    update.removeCases !== undefined ||
    update.caseOrder !== undefined;

  if (touchesCases && (field.type !== "enum" || field.addCase === undefined || field.setCaseOrder === undefined)) {
    throw new OperationError("INVALID_INPUT", `${field.name} is a ${field.type} field: only enum fields have cases.`);
  }

  return {
    field,
    name: update.name?.trim() ?? null,
    cases: touchesCases ? planCases(field, update) : null,
  };
}

function planCases(field: CmsFieldData, update: CmsFieldUpdate): CaseChanges {
  const cases = field.cases ?? [];
  const caseOf = (name: string) => {
    const found = cases.find((option) => same(option.name, name));

    if (found === undefined) {
      throw new OperationError(
        "INVALID_INPUT",
        `Field ${field.name} has no case "${name}". Cases: ${cases.map((option) => option.name).join(", ")}.`,
      );
    }

    return found;
  };
  const remove = unique((update.removeCases ?? []).map(caseOf));
  const rename = Object.entries(update.renameCases ?? {}).map(([from, name]) => ({
    option: caseOf(from),
    name: name.trim(),
  }));
  const kept = cases
    .filter((option) => !remove.includes(option))
    .map((option) => rename.find((entry) => entry.option === option)?.name ?? option.name);
  const add = unique(
    (update.addCases ?? []).map((name) => name.trim()).filter((name) => !kept.some((other) => same(other, name))),
  );
  const final = [...kept, ...add];

  if (rename.some(({ option }) => remove.includes(option))) {
    throw new OperationError("INVALID_INPUT", `Field ${field.name}: a case is both removed and renamed.`);
  }

  if (new Set(final.map((name) => name.toLowerCase())).size < final.length) {
    throw new OperationError("INVALID_INPUT", `Field ${field.name} would have two cases with one name.`);
  }

  for (const name of update.caseOrder ?? []) {
    if (!final.some((option) => same(option, name))) {
      throw new OperationError(
        "INVALID_INPUT",
        `Field ${field.name} will have no case "${name}" to order. Cases: ${final.join(", ")}.`,
      );
    }
  }

  return {
    remove,
    rename,
    add,
    first: update.caseOrder ?? null,
  };
}

function same(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function unique<Value>(values: readonly Value[]): Value[] {
  return [...new Set(values)];
}
