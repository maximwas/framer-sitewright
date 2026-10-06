import { OPERATIONS } from "@sitewright/core";
import { operationIcon } from "@sitewright/ui";
import { expect, it } from "vitest";

it("regression: every operation that changes the project has its own icon in the journal (seen: a plain square)", () => {
  // A preview, an upload or a publish changes no item the badges know, and fell back to a square.
  const missing = OPERATIONS.filter((operation) => operation.effect !== "read")
    .map((operation) => operation.name)
    .filter((name) => operationIcon(name) === null);

  expect(missing).toEqual([]);
});
