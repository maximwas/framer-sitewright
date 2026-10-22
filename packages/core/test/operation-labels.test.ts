import { expect, it } from "vitest";
import { OPERATION_LABELS } from "../src/constants/history.ts";
import { OPERATIONS } from "../src/operations/registry.ts";

it("regression: every operation has a journal label (seen: the journal titled an entry localization.addLocale)", () => {
  expect(OPERATIONS.map(({ name }) => name).filter((name) => OPERATION_LABELS[name] === undefined)).toEqual([]);
});
