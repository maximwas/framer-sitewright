import { expect, it } from "vitest";
import { AGENT_ONLY_OPERATION_NAMES, findPluginOperation, OPERATIONS, PLUGIN_OPERATIONS } from "../src/index.ts";

// Regression (08.10.2026): Framer's plugin review flagged code the plugin never runs (the page screenshot, readProject)
// because the plugin bundled every operation. The plugin's registry leaves out what needs framer.agent outright.
it("keeps the operations that need framer.agent outright out of the plugin, and every operation in the server's", () => {
  const pluginNames = PLUGIN_OPERATIONS.map((operation) => operation.name);

  for (const name of AGENT_ONLY_OPERATION_NAMES) {
    expect(pluginNames).not.toContain(name);
    expect(findPluginOperation(name)).toBeUndefined();
  }

  expect(findPluginOperation("site.screenshot")).toBeUndefined();
  expect(findPluginOperation("project.readProject")).toBeUndefined();
  expect(findPluginOperation("nodes.read")?.name).toBe("nodes.read");
  expect(OPERATIONS.map((operation) => operation.name).sort()).toEqual(
    [...pluginNames, ...AGENT_ONLY_OPERATION_NAMES].sort(),
  );
});
