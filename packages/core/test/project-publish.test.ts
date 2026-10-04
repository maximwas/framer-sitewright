import { expect, it } from "vitest";
import { runOperation } from "../src/operations/define.ts";
import { projectPublish } from "../src/operations/project/publish.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

it("publishes once per call and answers with the deployment and the address visitors see", async () => {
  const { runtime, state } = createFakeRuntime();

  expect(await runOperation(projectPublish, { runtime }, {})).toMatchObject({
    deploymentId: "deployment-1",
    status: "pending",
    url: "https://sandbox.framer.website",
  });
  expect(state.publishes).toBe(1);
});
