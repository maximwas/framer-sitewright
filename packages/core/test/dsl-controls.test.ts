import { expect, it } from "vitest";
import { separateControls } from "../src/dsl/controls.ts";

it("regression: sets each control of an instance in its own command, so one bad value drops only itself", () => {
  // Seen: an anchor link that did not exist yet dropped the title and every other control of the same command.
  expect(
    separateControls(
      [
        '+ComponentInstanceNode c1 parent="p1" component="K1" $control__title="Brass pen" $control__link="/#nope" $control__image.src="https://x/a.jpg" $control__image.alt="A pen";',
        'SET c2 name="Card" $control__title="Ink";',
      ].join("\n"),
    ),
  ).toBe(
    [
      '+ComponentInstanceNode c1 parent="p1" component="K1";',
      'SET c1 $control__title="Brass pen";',
      'SET c1 $control__link="/#nope";',
      'SET c1 $control__image.src="https://x/a.jpg" $control__image.alt="A pen";',
      'SET c2 name="Card" $control__title="Ink";',
    ].join("\n"),
  );
});
