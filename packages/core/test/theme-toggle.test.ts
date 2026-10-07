import { expect, it } from "vitest";
import { themeToggleCode } from "../src/utils/theme-toggle.ts";

it("writes an override that sets every token's light or dark value and touches the browser only after render", () => {
  const code = themeToggleCode([
    {
      id: "ink",
      path: "/Text/Primary",
      light: "rgb(18, 18, 17)",
      dark: "rgb(240, 240, 235)",
    },
  ]);

  expect(code).toContain('"ink": ["rgb(18, 18, 17)", "rgb(240, 240, 235)"],');
  expect(code).toContain("export function withThemeToggle(Component): ComponentType {");
  expect(code).toContain("useEffect(() => apply(saved()), [])");
  // Nothing reads the browser at module scope: the page is rendered statically first.
  expect(code.split("export function")[0]).not.toMatch(/^(?!\s).*(localStorage|matchMedia|document)\./m);
});
