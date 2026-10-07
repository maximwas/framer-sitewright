import { expect, it } from "vitest";
import { typeScale } from "../src/utils/type-scale.ts";

it("steps the sizes up and down the ratio from the body size, in whole pixels", () => {
  const sizes = Object.fromEntries(typeScale(16, 1.25).map(({ path, fontSize }) => [path, fontSize]));

  expect(sizes).toMatchObject({
    "Body/Default": "16px",
    "Body/Caption": "13px",
    "Heading/XS": "20px",
    Display: "61px",
  });
});
