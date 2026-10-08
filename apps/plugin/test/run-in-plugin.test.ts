import { createFakeRuntime } from "@sitewright/core/testing";
import { expect, it } from "vitest";
import { runInPlugin } from "../src/link/run-in-plugin.ts";

// The plugin no longer bundles the operations that need framer.agent outright: asked for one, it answers as those
// operations do without a key, not as if the name were unknown.
it("answers an operation that needs the Server API with the key error, not as an unknown operation", async () => {
  const { runtime } = createFakeRuntime(
    {},
    {
      transport: "plugin",
      withAgent: false,
    },
  );

  await expect(
    runInPlugin(runtime, () => true, "site.screenshot", { url: "https://example.com" }, { journal: false }),
  ).rejects.toMatchObject({
    code: "UNSUPPORTED_TRANSPORT",
    message: expect.stringContaining("Server API key"),
  });
  await expect(runInPlugin(runtime, () => true, "no.such", {}, { journal: false })).rejects.toMatchObject({
    code: "UNKNOWN_OP",
  });
});
