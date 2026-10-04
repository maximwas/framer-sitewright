import {
  designApply,
  type FramerRuntime,
  HistoryRecorder,
  historyRevert,
  nodesRead,
  runOperation,
} from "@sitewright/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TransportRouter } from "../../src/transports/router.ts";
import { createIntegrationTransports, integrationConfig, TEST_PREFIX } from "./helpers.ts";

const config = integrationConfig();

/** The Server API has the Plugin API's node methods too: without its agent it plays a session with no key. */
const withoutAgent = (runtime: FramerRuntime): FramerRuntime => ({
  ...runtime,
  agent: null,
});

describe.skipIf(config === null)("pages without a Server API key (the Plugin API path), on the sandbox", () => {
  let transports: TransportRouter;
  let runtime: FramerRuntime;
  let pageId: string;

  const apply = async (xml: string) => {
    const history = new HistoryRecorder();
    const output = await runOperation(
      designApply,
      {
        runtime,
        history,
      },
      { xml },
    );

    return {
      output,
      steps: [...history.steps],
    };
  };
  const read = async (nodeId: string) =>
    (
      await runOperation(
        nodesRead,
        { runtime },
        {
          nodeId,
          depth: 2,
        },
      )
    ).xml ?? "";
  const undo = (steps: readonly unknown[]) =>
    runOperation(
      historyRevert,
      {
        runtime,
        history: new HistoryRecorder(),
      },
      { steps: [...steps].reverse() },
    );

  beforeAll(async () => {
    if (config === null) {
      return;
    }

    transports = await createIntegrationTransports(config);
    runtime = withoutAgent(await transports.withServerApi(async (connected) => connected));

    // A throwaway design page; the port has no such method, the Server API does.
    const framer = runtime.port as unknown as { createDesignPage(name: string): Promise<{ id: string }> };

    pageId = (await framer.createDesignPage(`${TEST_PREFIX} plugin nodes`)).id;
  });

  afterAll(async () => {
    if (pageId !== undefined) {
      await runtime.port.removeNodes([pageId]);
    }

    await transports?.close();
  });

  it("builds, reads, changes and undoes frames and text through the Plugin API", async () => {
    const created = await apply(
      `<FrameNode parent="${pageId}" key="card" name="Card" width="320px" height="auto" layout="stack" stackDirection="vertical" gap="12px" padding="24px" fill="#f5f5f5" radius="16px">
        <RichTextNode key="title" name="Title">Hello</RichTextNode>
        <FrameNode key="bar" name="Bar" width="1fr" height="8px" fill="#0099ff" />
      </FrameNode>`,
    );

    expect(created.output).toMatchObject({ ok: true });

    const { card, title, bar } = created.output.keys ?? {};

    expect([card, title, bar].every((id) => typeof id === "string")).toBe(true);

    const xml = await read(card ?? "");

    expect(xml).toContain('layout="stack"');
    expect(xml).toContain('radius="16px"');
    expect(xml).toContain('fill="#f5f5f5"');
    expect(xml).toMatch(/<RichTextNode[^>]*position="relative"[^>]*>Hello<\/RichTextNode>/);

    // A change and its undo.
    const changed = await apply(
      `<FrameNode id="${card}" gap="20px"><RichTextNode id="${title}">Hi there</RichTextNode></FrameNode>`,
    );

    expect(changed.output.ok).toBe(true);
    expect(await read(card ?? "")).toContain('gap="20px"');
    await undo(changed.steps);

    const restored = await read(card ?? "");

    expect(restored).toContain('gap="12px"');
    expect(restored).toContain(">Hello</RichTextNode>");

    // What only the DSL has refuses the whole batch, before anything changes.
    const refused = await apply(`<FrameNode id="${card}" gap="40px" appearEffect.trigger="onMount" />`);

    expect(refused.output.ok).toBe(false);
    expect(refused.output.errors[0]?.message).toContain("Server API key");
    expect(await read(card ?? "")).toContain('gap="12px"');

    // A deletion and its undo: the frame comes back with a new id and its look.
    const deleted = await apply(`<FrameNode id="${bar}" $delete="true" />`);

    expect(deleted.output.ok).toBe(true);
    expect(await read(card ?? "")).not.toContain('name="Bar"');

    const recreated = await undo(deleted.steps);

    expect(recreated.results).toMatchObject([{ outcome: "recreated" }]);
    expect(await read(card ?? "")).toMatch(/<FrameNode[^>]*name="Bar"[^>]*fill="#0099ff"/);

    // Undoing the creation removes the card.
    await undo(created.steps.filter((step) => step.id === card));
    expect(await runtime.port.getNode(card ?? "")).toBeNull();
  });
});
