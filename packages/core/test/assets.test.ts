import { describe, expect, it } from "vitest";
import { HistoryRecorder } from "../src/history/recorder.ts";
import { matchIcons } from "../src/operations/assets/icon-match.ts";
import { iconsSearch } from "../src/operations/assets/icons-search.ts";
import { svgAdd } from "../src/operations/assets/svg-add.ts";
import { componentInsert } from "../src/operations/components/insert.ts";
import { runOperation } from "../src/operations/define.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

describe("icons", () => {
  it("ranks names by the query words they hold, a name starting with the first word first", () => {
    const names = ["Caret Arrow Right", "Arrow Right", "Arrow Left", "Arrow Up Right", "Right Triangle"];

    expect(matchIcons(names, "arrow right", 10)).toEqual(["Arrow Right", "Arrow Up Right", "Caret Arrow Right"]);
    expect(matchIcons(names, "menu", 10)).toEqual([]);
  });

  it("searches one set by name, and reads controls only of the sets with a match", async () => {
    const fake = createFakeRuntime();

    fake.state.iconSets = [
      {
        id: "ph",
        displayName: "Phosphor",
        group: "external",
        icons: ["List", "List Bullets", "X"],
        controls: { $control__color: { type: "color" } },
      },
      {
        id: "logos",
        displayName: "Logos",
        group: "additional",
        icons: ["Framer", "Figma"],
        controls: { $control__fill: { type: "color" } },
      },
    ];

    const result = await runOperation(
      iconsSearch,
      { runtime: fake.runtime },
      {
        query: "list",
        set: "phosphor",
      },
    );

    expect(result.sets.map(({ name, group }) => [name, group])).toEqual([
      ["Phosphor", "external"],
      ["Logos", "additional"],
    ]);
    expect(result.matches).toEqual([
      {
        setId: "ph",
        setName: "Phosphor",
        icons: ["List", "List Bullets"],
        controls: { $control__color: { type: "color" } },
      },
    ]);
  });
});

describe("svg.add", () => {
  it("regression: says which layer the SVG became and puts it where asked", async () => {
    const { runtime, state } = createFakeRuntime(
      {},
      {
        withAgent: false,
        transport: "plugin",
      },
    );
    const result = await runOperation(
      svgAdd,
      { runtime },
      {
        svg: '<svg width="10" height="10" viewBox="0 0 10 10"></svg>',
        parentId: "logo-frame",
      },
    );

    expect(result.nodeIds).toEqual(state.selection);
    expect(state.moves).toEqual([
      {
        nodeId: state.selection[0],
        parentId: "logo-frame",
      },
    ]);
  });
});

describe("components.insert", () => {
  it("regression: asks Framer to insert the instance into its parent, so it never lands in the user's selection first", async () => {
    const { runtime, state } = createFakeRuntime(
      {},
      {
        withAgent: false,
        transport: "plugin",
      },
    );

    await runOperation(
      componentInsert,
      { runtime },
      {
        url: "https://framer.com/m/Carousel-TC0BVf.js@NX0Ibe5BZmuZM0cYmZOE",
        parentId: "testimonials",
      },
    );

    expect(state.instances[0]?.parentId).toBe("testimonials");
  });

  it("regression: undo removes the inserted instance (seen: the journal said to delete it with design_apply)", async () => {
    const { runtime, state } = createFakeRuntime();

    state.canvas.push({
      id: "row",
      parentId: "breakpoint-desktop",
      className: "FrameNode",
      name: "Row",
      attributes: { layout: "stack" },
    });

    const history = new HistoryRecorder();
    const { nodeId } = await runOperation(
      componentInsert,
      {
        runtime,
        history,
      },
      {
        url: "https://framer.com/m/Carousel-TC0BVf.js@NX0Ibe5BZmuZM0cYmZOE",
        parentId: "row",
      },
    );

    expect(history.incomplete).toBeNull();
    expect(history.steps).toEqual([
      {
        kind: "node",
        id: nodeId,
        type: "ComponentInstanceNode",
        name: null,
        pagePath: "/",
        change: "created",
        before: null,
        after: {
          parentId: "row",
          index: null,
          attributes: {},
          nodes: [],
          overrides: {},
        },
      },
    ]);
  });

  it("regression: puts the instance into a stack's flow, not where Framer dropped it (seen: absolute at left 5560px)", async () => {
    const { runtime, state } = createFakeRuntime();

    state.canvas.push({
      id: "row",
      parentId: "page",
      className: "FrameNode",
      name: "Row",
      attributes: { layout: "stack" },
    });

    const { nodeId } = await runOperation(
      componentInsert,
      { runtime },
      {
        url: "https://framer.com/m/Carousel-TC0BVf.js@NX0Ibe5BZmuZM0cYmZOE",
        parentId: "row",
      },
    );

    expect(state.canvas.find((layer) => layer.id === nodeId)?.attributes?.position).toBe("relative");
  });

  it("inserts a component by its module URL and moves the instance where asked", async () => {
    const { runtime, state } = createFakeRuntime(
      {},
      {
        withAgent: false,
        transport: "plugin",
      },
    );
    const url = "https://framer.com/m/Carousel-TC0BVf.js@NX0Ibe5BZmuZM0cYmZOE";
    const result = await runOperation(
      componentInsert,
      { runtime },
      {
        url,
        parentId: "testimonials",
        index: 1,
      },
    );

    expect(state.instances).toEqual([
      {
        id: result.nodeId,
        url,
        parentId: "testimonials",
      },
    ]);
    expect(state.moves).toEqual([
      {
        nodeId: result.nodeId,
        parentId: "testimonials",
        index: 1,
      },
    ]);
  });
});
