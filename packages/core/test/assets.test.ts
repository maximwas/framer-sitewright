import { describe, expect, it } from "vitest";
import { matchIcons } from "../src/operations/assets/icon-match.ts";
import { iconsSearch } from "../src/operations/assets/icons-search.ts";
import { svgAdd } from "../src/operations/assets/svg-add.ts";
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
