import { expect, it } from "vitest";
import { patchCode } from "../src/utils/code-patch.ts";

it("applies edits in order and refuses an edit that is missing or ambiguous instead of guessing", () => {
  expect(
    patchCode("a = 1; b = 1;", [
      {
        find: "a = 1",
        replace: "a = $2",
      },
    ]),
  ).toEqual({
    code: "a = $2; b = 1;",
    failed: [],
  });
  expect(
    patchCode("x x", [
      {
        find: "x",
        replace: "y",
        all: true,
      },
    ]).code,
  ).toBe("y y");
  expect(
    patchCode("x x", [
      {
        find: "x",
        replace: "y",
      },
    ]).failed,
  ).toEqual(["edit 1: its find text is there 2 times; give more context or all: true"]);
  expect(
    patchCode("x", [
      {
        find: "z",
        replace: "y",
      },
    ]).failed,
  ).toEqual(["edit 1: its find text is not in the file"]);
});
