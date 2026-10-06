import { expect, it } from "vitest";
import { needsAgent, runOperation } from "../src/operations/define.ts";
import { publishPreview } from "../src/operations/project/publish-preview.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

it("previews a publish without publishing: blocking errors, warnings, changed pages by path, and the URLs", async () => {
  const { runtime, state } = createFakeRuntime({
    webPages: [
      {
        id: "page-home",
        path: "/",
        draft: false,
        collectionId: null,
      },
    ],
    // What Framer's preview answers (the sandbox, 06.10.2026), with one error and one warning added.
    publishPreview: {
      action: "preview",
      status: "ready",
      message: 'Review changelog and warnings, then confirm publish with confirmationHash "1wurnm".',
      stagingEnabled: false,
      publishTarget: "production",
      confirmationHash: "1wurnm",
      errors: [
        {
          message: "Broken link to /old",
          nodeId: "link-1",
        },
      ],
      warnings: ["The page has no title"],
      changes: [
        {
          type: "WebPage",
          nodeId: "page-home",
          name: "Home",
          status: "updated",
        },
        {
          type: "SmartComponent",
          nodeId: "comp-1",
          name: "FAQ item",
          status: "added",
        },
      ],
      changesCount: 2,
      urls: { production: "https://studio.framer.app" },
      nextAction: {
        type: "confirm_publish",
        confirmationHash: "1wurnm",
      },
    },
  });

  expect(needsAgent(publishPreview, {})).toBe(true);

  const preview = await runOperation(publishPreview, { runtime }, {});

  expect(preview).toEqual({
    status: "ready",
    blocked: true,
    target: "production",
    stagingEnabled: false,
    errors: [
      {
        message: "Broken link to /old",
        nodeId: "link-1",
      },
    ],
    warnings: [
      {
        message: "The page has no title",
        nodeId: null,
      },
    ],
    changes: [
      {
        type: "WebPage",
        name: "Home",
        status: "updated",
        path: "/",
      },
      {
        type: "SmartComponent",
        name: "FAQ item",
        status: "added",
        path: null,
      },
    ],
    totalChanges: 2,
    urls: { production: "https://studio.framer.app" },
  });
  // Only a preview was asked for, and nothing went out: no confirmation hash leaves the operation either.
  expect(state.agentPublishes).toEqual([{ action: "preview" }]);
  expect(state.publishes).toBe(0);
  expect(JSON.stringify(preview)).not.toContain("1wurnm");
});

it("needs the Server API key: the plugin has no framer.agent", async () => {
  const { runtime } = createFakeRuntime(
    {},
    {
      withAgent: false,
      transport: "plugin",
    },
  );

  await expect(runOperation(publishPreview, { runtime }, {})).rejects.toThrow(/Server API key/);
});
