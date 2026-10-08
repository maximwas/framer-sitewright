import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { parseConfig } from "../src/config/config.ts";

// Regression (08.10.2026): the marketplace plugin's hello was dropped by the bridge window, which knew only the
// development plugin's origin, so Connect never connected.
it("relays for the published Sitewright plugin as well as the development one", () => {
  const { config } = parseConfig({}, tmpdir());

  expect(config.pluginOrigins).toContain("https://5iqjj58d3q5bu5e29j5lpq0po.plugins.framercdn.com");
  expect(config.pluginOrigins).toContain("https://localhost:5173");
});
