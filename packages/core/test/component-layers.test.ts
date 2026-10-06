import { describe, expect, it } from "vitest";
import { componentDetach } from "../src/operations/components/detach.ts";
import { componentMakeLocal } from "../src/operations/components/make-local.ts";
import { sectionInsert } from "../src/operations/components/section-insert.ts";
import { runOperation } from "../src/operations/define.ts";
import { createFakeRuntime } from "../src/testing/index.ts";
import type { FramerRuntime } from "../src/types/framer.ts";

const FOOTER = "https://framer.com/m/Liquid-Glass-Footer-PpecQS.js@NwnM5wWKuZaTzAqqZTeX";

describe("components.makeLocal", () => {
  it("passes needs_confirmation on in Sitewright's words and copies only with the replaceAll the next call gives", async () => {
    const { runtime, state } = createFakeRuntime();
    const asked = await runOperation(componentMakeLocal, { runtime }, { nodeId: "footer" });

    expect(asked).toMatchObject({
      status: "needs_confirmation",
      nodeId: "footer",
      component: null,
    });
    expect(asked.message).toContain("replaceAll");
    expect(asked.message).not.toContain("ask_clarification");

    const made = await runOperation(
      componentMakeLocal,
      { runtime },
      {
        nodeId: "footer",
        replaceAll: false,
      },
    );

    expect(made).toMatchObject({
      status: "success",
      component: {
        name: "Component",
        codeFile: null,
      },
    });
    // No choice the user did not make: the first call goes without replaceAll, the second with theirs.
    expect(state.componentAgentCalls.map(({ input }) => input)).toEqual([
      { id: "footer" },
      {
        id: "footer",
        replaceAll: false,
      },
    ]);
  });

  it("says when a code component became a code file of the project", async () => {
    const { runtime } = createFakeRuntime({
      componentAgentAnswers: [
        {
          status: "success",
          message: "Made external component local.",
          component: {
            id: "codeFile/xeOEAeX:default",
            displayName: "ServiceTiles",
            filePath: "Component_01.tsx",
          },
        },
      ],
    });
    const made = await runOperation(
      componentMakeLocal,
      { runtime },
      {
        nodeId: "tiles",
        replaceAll: true,
      },
    );

    expect(made.component).toEqual({
      id: "codeFile/xeOEAeX:default",
      name: "ServiceTiles",
      codeFile: "Component_01.tsx",
    });
    expect(made.message).toContain("code_file_write");
  });

  it("fails with Framer's reason when it refuses", async () => {
    const { runtime } = createFakeRuntime({
      componentAgentAnswers: [
        {
          status: "blocked",
          message: "This `ComponentInstanceNode` is not an external component.",
        },
      ],
    });

    await expect(
      runOperation(
        componentMakeLocal,
        { runtime },
        {
          nodeId: "button",
          replaceAll: false,
        },
      ),
    ).rejects.toMatchObject({
      code: "WRITE_FAILED",
      reason: expect.stringContaining("not an external component"),
    });
  });
});

describe("components.detach", () => {
  it("regression: the new root keeps the instance's place in its parent, which Framer's flatten drops (seen: relative became absolute)", async () => {
    const { runtime, state } = createFakeRuntime({
      canvas: [
        {
          id: "footer",
          parentId: "breakpoint-desktop",
          className: "ComponentInstanceNode",
          name: "Footer",
          attributes: {
            position: "relative",
            top: null,
            left: null,
            width: "100%",
          },
        },
      ],
    });
    const result = await runOperation(componentDetach, { runtime }, { nodeId: "footer" });

    expect(result).toMatchObject({
      instanceId: "footer",
      name: "Footer",
      note: null,
    });
    expect(state.canvas.find((layer) => layer.id === result.nodeId)?.attributes).toMatchObject({
      position: "relative",
      top: null,
      left: null,
      width: "100%",
    });
  });

  it("fails with the way out in Sitewright's tool names when Framer blocks an external instance", async () => {
    const { runtime } = createFakeRuntime({
      componentAgentAnswers: [
        {
          status: "blocked",
          message:
            "Cannot flatten an external `ComponentInstanceNode`. Use `make_external_component_local` first to convert it to a local `ComponentInstanceNode`, then flatten.",
        },
      ],
    });

    await expect(runOperation(componentDetach, { runtime }, { nodeId: "carousel" })).rejects.toMatchObject({
      code: "WRITE_FAILED",
      reason: expect.stringContaining("component_make_local"),
    });
  });
});

describe("components.insertSection", () => {
  it("regression: moves the layers from where Framer dropped them into the parent's flow at the index (seen: absolute at 4320px)", async () => {
    const { runtime, state } = createFakeRuntime({
      canvas: [
        {
          id: "main",
          parentId: "breakpoint-desktop",
          className: "FrameNode",
          name: "Main",
          attributes: { layout: "stack" },
        },
      ],
    });
    const result = await runOperation(
      sectionInsert,
      { runtime },
      {
        url: FOOTER,
        parentId: "main",
        index: 2,
      },
    );

    expect(state.detachedLayers).toEqual([
      {
        id: result.nodeId,
        url: FOOTER,
        layout: false,
      },
    ]);
    expect(state.moves).toEqual([
      {
        nodeId: result.nodeId,
        parentId: "main",
        index: 2,
      },
    ]);
    expect(state.canvas.find((layer) => layer.id === result.nodeId)?.attributes).toMatchObject({
      position: "relative",
    });
    expect(result.note).toBeNull();
  });

  it("says when Framer did not match the variants to the page's breakpoints, and pins the layers in a free parent", async () => {
    const { runtime, state } = createFakeRuntime();
    const result = await runOperation(
      sectionInsert,
      { runtime },
      {
        url: FOOTER,
        parentId: "breakpoint-desktop",
        layout: true,
      },
    );

    expect(result.note).toContain("breakpoints");
    expect(state.canvas.find((layer) => layer.id === result.nodeId)?.attributes).toMatchObject({
      left: "0px",
      top: "0px",
    });
  });

  it("fails with what it takes when Framer cannot detach the component (a code component)", async () => {
    const { runtime } = createFakeRuntime();
    const refusing: FramerRuntime = {
      ...runtime,
      port: {
        ...runtime.port,
        addDetachedComponentLayers: async () => {
          throw new Error("Failed to load component for detaching. It might not be a visual component.");
        },
      },
    };

    await expect(
      runOperation(
        sectionInsert,
        { runtime: refusing },
        {
          url: FOOTER,
          parentId: "breakpoint-desktop",
        },
      ),
    ).rejects.toMatchObject({
      code: "WRITE_FAILED",
      hint: expect.stringContaining("component_insert"),
    });
  });
});
