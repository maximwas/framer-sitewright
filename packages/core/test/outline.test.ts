import { expect, it } from "vitest";
import { codeOutline } from "../src/operations/code/code-tools.ts";
import { outlineControls } from "../src/utils/component-controls.ts";

it("regression: components_read's outline puts each control on one line (seen: 63k characters, two icon enums)", () => {
  const icons = Array.from({ length: 1500 }, (_, index) => `icon-${index}`);

  expect(
    outlineControls({
      controls: {
        $control__variant: {
          type: "enum",
          options: ["Primary", "Light"],
        },
        $control__icon: {
          type: "enum",
          options: icons,
        },
        $control__label: { type: "string" },
      },
    }),
  ).toEqual({
    $control__variant: "enum: Primary | Light",
    $control__icon: "enum: icon-0 | icon-1 | icon-2 | icon-3 | icon-4 | icon-5 | icon-6 | icon-7 (+1492 more)",
    $control__label: "string",
  });
});

it("regression: code_files_read's outline keeps the declaring lines with their numbers (seen: 85k for three files)", () => {
  const file = [
    'import { addPropertyControls, ControlType } from "framer"',
    "",
    "interface Props {",
    "    speed: number",
    "}",
    "",
    "export default function Ticker({ speed }: Props) {",
    "    const items = [1, 2, 3]",
    "    return <div>{items.length}</div>",
    "}",
    "",
    "addPropertyControls(Ticker, {",
    "    speed: { type: ControlType.Number, min: 0 },",
    "})",
  ].join("\n");

  expect(codeOutline(file)).toBe(
    [
      "3: interface Props {",
      "7: export default function Ticker({ speed }: Props) {",
      "12: addPropertyControls(Ticker, {",
      "13:     speed: { type: ControlType.Number, min: 0 },",
    ].join("\n"),
  );
});
