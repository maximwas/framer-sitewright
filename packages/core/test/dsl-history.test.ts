import { describe, expect, it } from "vitest";
import { parseDsl } from "../src/dsl/parse.ts";
import { applyAliases } from "../src/history/aliases.ts";
import { planCapture } from "../src/history/dsl/capture.ts";
import { withoutSurvivors } from "../src/history/dsl/deleted-snapshot.ts";
import { missedChanges } from "../src/history/dsl/missed-changes.ts";
import { planNodeRevert } from "../src/history/dsl/node-revert-plan.ts";
import { nodeSteps } from "../src/history/dsl/steps.ts";
import type { SerializedNode } from "../src/types/dsl.ts";
import type { DslSnapshots, NodePlacement, NodeSnapshot, NodeStep } from "../src/types/history.ts";

// Shaped like live serialize() output (spikes a2-01..03, 30.09.2026).
const bp: SerializedNode = {
  type: "FrameNode",
  id: "bp",
  $isPrimary: true,
  attributes: { layout: "stack" },
  children: [
    {
      type: "FrameNode",
      id: "card",
    },
  ],
};

function richText(id: string, text: string, parentId = "card"): SerializedNode {
  return {
    type: "RichTextNode",
    id,
    $parentId: parentId,
    attributes: {
      fontSize: "16px",
      textColor: "rgb(0, 0, 0)",
    },
    children: [
      {
        type: "TextBlock",
        id: `v:${id}:0`,
        attributes: { tag: "p" },
        children: [
          {
            type: "TextRun",
            id: `v:${id}:0:0`,
            attributes: { text },
          },
        ],
      },
    ],
  };
}

function node(id: string, attributes: Record<string, string>, extra: Partial<SerializedNode> = {}): SerializedNode {
  return {
    type: "FrameNode",
    id,
    name: "Card",
    $parentId: "bp",
    attributes,
    ...extra,
  };
}

function snapshot(partial: Partial<NodeSnapshot> & Pick<NodeSnapshot, "id" | "parentId" | "index">): NodeSnapshot {
  return {
    type: "FrameNode",
    name: null,
    params: {},
    attributes: {},
    replicaOf: null,
    gesture: null,
    ...partial,
  };
}

let temp = 0;
const options = (force = false) => ({
  force,
  nextTempId: () => `undo${temp++}`,
});

describe("DSL history: what a batch touches", () => {
  it("lists new nodes by temp id and existing ones by change, skipping commands on the batch's own nodes", () => {
    const capture = planCapture(
      parseDsl(
        [
          '+FrameNode box parent="bp";',
          'SET box width="1fr";',
          'CREATE_VARIANT tablet from="bp";',
          'SET tabletF8LWSlM2C width="80px";',
          'SET boxer fill="red";',
          'SET card text="New";',
          'MOVE card parent="box";',
          "DEL old;",
          "RENAME old;",
        ].join("\n"),
      ),
    );

    expect(capture.targets).toEqual([
      {
        change: "created",
        id: "box",
        type: "FrameNode",
      },
      {
        change: "created",
        id: "tablet",
        type: null,
      },
      // "boxer" only starts with the temp id "box": it is an existing node.
      {
        change: "updated",
        id: "boxer",
        text: false,
      },
      {
        change: "updated",
        id: "card",
        text: true,
      },
      {
        change: "moved",
        id: "card",
      },
      {
        change: "deleted",
        id: "old",
      },
    ]);
    expect(capture.unsupported).toEqual(["RENAME old"]);
  });

  it("regression: block and run commands are a change to their rich text, since their ids are positional", () => {
    const capture = planCapture(
      parseDsl('DEL v:title:0;\n+TextBlock b1 parent="title" tag="h2";\n+TextRun r1 parent="b1" text="Hi";'),
    );

    expect(capture.targets).toEqual([
      {
        change: "updated",
        id: "title",
        text: true,
      },
    ]);
  });
});

describe("DSL history: steps from before and after", () => {
  const base: DslSnapshots = {
    pagePath: "/",
    targets: [],
    renamedIds: {},
    before: {
      nodes: new Map(),
      placements: new Map(),
      deleted: new Map(),
      unplaced: [],
    },
    after: {
      nodes: new Map(),
      placements: new Map(),
    },
  };

  it("records only changed attributes, text content, moves and creations", () => {
    const steps = nodeSteps({
      ...base,
      targets: [
        {
          change: "created",
          id: "tmp",
          type: "FrameNode",
        },
        {
          change: "updated",
          id: "card",
          text: false,
        },
        {
          change: "updated",
          id: "title",
          text: true,
        },
        {
          change: "moved",
          id: "card",
        },
        {
          change: "updated",
          id: "same",
          text: false,
        },
      ],
      renamedIds: { tmp: "NEW000001" },
      before: {
        ...base.before,
        nodes: new Map([
          [
            "card",
            node("card", {
              width: "100px",
              fill: "red",
            }),
          ],
          ["title", richText("title", "Old")],
          ["same", node("same", { width: "1fr" })],
        ]),
        placements: new Map([
          [
            "card",
            {
              parentId: "bp",
              index: 0,
            },
          ],
        ]),
      },
      after: {
        nodes: new Map([
          ["NEW000001", node("NEW000001", { width: "1fr" })],
          [
            "card",
            node("card", {
              width: "120px",
              fill: "red",
              maxWidth: "1080px",
            }),
          ],
          ["title", richText("title", "New")],
          ["same", node("same", { width: "1fr" })],
        ]),
        placements: new Map([
          [
            "card",
            {
              parentId: "box",
              index: 2,
            },
          ],
        ]),
      },
    });

    expect(steps.map((step) => [step.change, step.id])).toEqual([
      ["created", "NEW000001"],
      ["updated", "card"],
      ["updated", "title"],
      ["moved", "card"],
    ]);
    expect(steps[1]?.before?.attributes).toEqual({
      width: "100px",
      maxWidth: null,
    });
    expect(steps[1]?.after?.attributes).toEqual({
      width: "120px",
      maxWidth: "1080px",
    });
    expect(steps[2]?.before?.nodes.map((block) => block.attributes)).toEqual([{ tag: "p" }, { text: "Old" }]);
    expect(steps[3]?.before).toMatchObject({
      parentId: "bp",
      index: 0,
    });
  });
});

describe("DSL history: what undo cannot bring back", () => {
  it("regression: a node the batch changed but could not read before (a component, the root) marks the entry incomplete", () => {
    const reasons = missedChanges(
      {
        pagePath: "/",
        targets: [
          {
            change: "deleted",
            id: "component",
          },
          {
            change: "updated",
            id: "root",
            text: false,
          },
        ],
        renamedIds: {},
        before: {
          nodes: new Map(),
          placements: new Map(),
          deleted: new Map(),
          unplaced: [],
        },
        after: {
          nodes: new Map(),
          placements: new Map(),
        },
      },
      false,
    );

    expect(reasons).toEqual([expect.stringContaining("Nodes component, root could not be read before the change")]);
  });
});

describe("DSL history: text alignment", () => {
  it('regression: an unset alignment reads "start", so a created text records it as null, not a pinned "start"', () => {
    const text = (id: string, textAlignment: string): SerializedNode => ({
      ...richText(id, "Hero"),
      attributes: {
        textStylePreset: "Heading/Centered",
        textAlignment,
      },
    });
    const steps = nodeSteps({
      pagePath: "/",
      targets: ["a", "b"].map((id) => ({
        change: "created" as const,
        id,
        type: "RichTextNode",
      })),
      renamedIds: {},
      before: {
        nodes: new Map(),
        placements: new Map(),
        deleted: new Map(),
        unplaced: [],
      },
      after: {
        nodes: new Map([
          ["a", text("a", "start")],
          ["b", text("b", "center")],
        ]),
        placements: new Map(),
      },
    });

    expect(steps.map((step) => step.after?.attributes.textAlignment)).toEqual([null, "center"]);
  });
});

describe("DSL history: effects", () => {
  it("regression: effects and shadows are recorded, and an effect the batch added is undone whole", () => {
    const plain: SerializedNode = {
      type: "FrameNode",
      id: "card",
      $parentId: "bp",
      attributes: { width: "200px" },
    };
    const animated: SerializedNode = {
      ...plain,
      attributes: {
        width: "200px",
        appearEffect: {
          trigger: "onInView",
          enter: {
            opacity: 0,
            y: 24,
          },
        },
        boxShadows: ["0px 8px 16px 0px rgba(0, 0, 0, 0.2)"],
      },
    };
    const [step] = nodeSteps({
      pagePath: "/",
      targets: [
        {
          change: "updated",
          id: "card",
          text: false,
        },
      ],
      renamedIds: {},
      before: {
        nodes: new Map([["card", plain]]),
        placements: new Map(),
        deleted: new Map(),
        unplaced: [],
      },
      after: {
        nodes: new Map([["card", animated]]),
        placements: new Map(),
      },
    });

    expect(step?.before?.attributes).toEqual({
      appearEffect: null,
      "boxShadows.0": null,
    });
    expect(step?.after?.attributes).toMatchObject({
      "appearEffect.trigger": "onInView",
      "appearEffect.enter.y": 24,
      "boxShadows.0": "0px 8px 16px 0px rgba(0, 0, 0, 0.2)",
    });

    if (step === undefined) {
      return;
    }

    const current = (serialized: SerializedNode) => ({
      nodes: new Map([["card", serialized]]),
      placements: new Map<string, NodePlacement>(),
    });

    expect(planNodeRevert([step], current(animated), options()).commands).toEqual([
      'SET card appearEffect="null" boxShadows.0="null";',
    ]);
    // Still animated is not "as before": a whole-effect null must not match a node that has the effect.
    expect(planNodeRevert([step], current(plain), options()).decisions[0]?.outcome).toBe("unchanged");
  });
});

describe("DSL history: renames", () => {
  it('regression: a rename is a change, and clearing a name is name=""', () => {
    const [renamed] = nodeSteps({
      pagePath: "/",
      targets: [
        {
          change: "updated",
          id: "card",
          text: false,
        },
      ],
      renamedIds: {},
      before: {
        nodes: new Map([["card", node("card", { width: "1fr" }, { name: undefined })]]),
        placements: new Map(),
        deleted: new Map(),
        unplaced: [],
      },
      after: {
        nodes: new Map([["card", node("card", { width: "1fr" }, { name: "Hero card" })]]),
        placements: new Map(),
      },
    });

    expect(renamed?.before?.attributes).toEqual({ name: "" });
    expect(renamed?.after?.attributes).toEqual({ name: "Hero card" });
  });
});

describe("DSL history: undo plan", () => {
  function step(partial: Partial<NodeStep> & Pick<NodeStep, "id" | "change">): NodeStep {
    return {
      kind: "node",
      type: "FrameNode",
      name: null,
      pagePath: "/",
      before: null,
      after: null,
      ...partial,
    };
  }

  function state(partial: Partial<NonNullable<NodeStep["before"]>>) {
    return {
      parentId: null,
      index: null,
      attributes: {},
      nodes: [],
      overrides: {},
      ...partial,
    };
  }

  const current = (...nodes: SerializedNode[]) => ({
    nodes: new Map(nodes.map((serialized) => [serialized.id, serialized])),
    placements: new Map<string, NodePlacement>(),
  });

  it("deletes a created node unless someone changed it since, and sets attributes back", () => {
    const created = step({
      id: "made",
      change: "created",
      after: state({ attributes: { width: "1fr" } }),
    });
    const updated = step({
      id: "card",
      change: "updated",
      before: state({
        attributes: {
          width: "100px",
          maxWidth: null,
        },
      }),
      after: state({
        attributes: {
          width: "120px",
          maxWidth: "1080px",
        },
      }),
    });
    const plan = planNodeRevert(
      [created, updated],
      current(
        node("made", { width: "1fr" }),
        node("card", {
          width: "120px",
          maxWidth: "1080px",
        }),
      ),
      options(),
    );

    expect(plan.commands).toEqual(["DEL made;", 'SET card width="100px" maxWidth="null";']);
    expect(plan.decisions.map((decision) => decision.outcome)).toEqual(["deleted", "restored"]);

    const edited = planNodeRevert([created], current(node("made", { width: "300px" })), options());

    expect(edited.decisions[0]?.outcome).toBe("conflict");
    expect(edited.commands).toEqual([]);
    expect(planNodeRevert([created], current(node("made", { width: "300px" })), options(true)).commands).toEqual([
      "DEL made;",
    ]);
  });

  it("restores rich text by recreating its blocks, and moves a node back to its old place", () => {
    const text = step({
      id: "title",
      type: "RichTextNode",
      change: "updated",
      before: state({
        nodes: [
          snapshot({
            id: "v:title:0",
            type: "TextBlock",
            parentId: "title",
            index: 0,
            attributes: { tag: "h2" },
          }),
          snapshot({
            id: "v:title:0:0",
            type: "TextRun",
            parentId: "v:title:0",
            index: 0,
            attributes: { text: "Old" },
          }),
        ],
      }),
      after: state({ nodes: [] }),
    });
    const moved = step({
      id: "card",
      change: "moved",
      before: state({
        parentId: "bp",
        index: 0,
      }),
      after: state({
        parentId: "box",
        index: 2,
      }),
    });

    temp = 0;

    const plan = planNodeRevert(
      [text, moved],
      current(richText("title", "New"), node("card", {}, { $parentId: "box" }), bp),
      options(true),
    );

    expect(plan.commands).toEqual([
      "DEL v:title:0;",
      '+TextBlock undo0 parent="title" index="0" tag="h2";',
      '+TextRun undo1 parent="undo0" index="0" text="Old";',
      'MOVE card parent="bp" index="0";',
    ]);
  });

  it("recreates a deleted subtree in place, with replica overrides once ids are real", () => {
    const deleted = step({
      id: "card",
      change: "deleted",
      before: state({
        parentId: "bp",
        index: 1,
        nodes: [
          snapshot({
            id: "card",
            name: "Card",
            parentId: "bp",
            index: 1,
            attributes: { fill: "rgb(240, 240, 240)" },
          }),
          snapshot({
            id: "inst",
            type: "ComponentInstanceNode",
            parentId: "card",
            index: 0,
            params: { component: "comp" },
            attributes: { $control__variant: "Primary" },
          }),
        ],
        overrides: { tablet: { card: { fill: "rgb(0, 0, 0)" } } },
      }),
    });

    temp = 0;

    const plan = planNodeRevert([deleted], current(bp), options());

    expect(plan.commands).toEqual([
      '+FrameNode undo0 parent="bp" index="1" name="Card" fill="rgb(240, 240, 240)";',
      '+ComponentInstanceNode undo1 parent="undo0" index="0" component="comp" $control__variant="Primary";',
    ]);
    expect(plan.pendingOverrides).toEqual([
      {
        replicaId: "tablet",
        tempId: "undo0",
        attributes: { fill: "rgb(0, 0, 0)" },
      },
    ]);
    expect([...plan.recreated]).toEqual([
      ["card", "undo0"],
      ["inst", "undo1"],
    ]);
  });

  it("recreates a deleted replica variant with CREATE_VARIANT and its overrides in the same batch", () => {
    const deleted = step({
      id: "hover",
      change: "deleted",
      before: state({
        parentId: "comp",
        index: 1,
        nodes: [
          snapshot({
            id: "hover",
            name: "Hover",
            parentId: "comp",
            index: 1,
            replicaOf: "primary",
            gesture: "hover",
            attributes: { left: "260px" },
          }),
        ],
        overrides: { hover: { label: { fontSize: "20px" } } },
      }),
    });

    temp = 0;

    expect(planNodeRevert([deleted], current(), options()).commands).toEqual([
      'CREATE_VARIANT undo0 from="primary" gesture="hover";',
      'SET undo0 name="Hover" left="260px";',
      'SET undo0label fontSize="20px";',
    ]);
  });

  it("walks a chain: a set on a node that an older step deletes targets the recreated node", () => {
    const deleted = step({
      id: "card",
      change: "deleted",
      before: state({
        parentId: "bp",
        index: 0,
        nodes: [
          snapshot({
            id: "card",
            parentId: "bp",
            index: 0,
            attributes: { width: "120px" },
          }),
        ],
      }),
    });
    const updated = step({
      id: "card",
      change: "updated",
      before: state({ attributes: { width: "100px" } }),
      after: state({ attributes: { width: "120px" } }),
    });

    temp = 0;

    // Newest first: the DEL came after the SET.
    expect(planNodeRevert([deleted, updated], current(bp), options()).commands).toEqual([
      '+FrameNode undo0 parent="bp" index="0" width="120px";',
      'SET undo0 width="100px";',
    ]);
  });

  it("regression: undoing an unwrap moves the child back into the recreated wrapper instead of copying it", () => {
    const wrapper = snapshot({
      id: "wrap",
      name: "Wrap",
      parentId: "bp",
      index: 1,
    });
    const child = snapshot({
      id: "child",
      name: "Child",
      parentId: "wrap",
      index: 0,
    });
    const other = snapshot({
      id: "other",
      parentId: "wrap",
      index: 1,
    });
    // MOVE child parent="bp"; DEL wrap; — the child outlived its wrapper.
    const pruned = withoutSurvivors(
      {
        nodes: [wrapper, child, other],
        overrides: {},
        truncated: false,
      },
      new Set(["child"]),
    );
    const deleted = step({
      id: "wrap",
      change: "deleted",
      before: state({
        parentId: "bp",
        index: 1,
        nodes: [...pruned.nodes],
        overrides: pruned.overrides,
      }),
    });
    const moved = step({
      id: "child",
      change: "moved",
      before: state({
        parentId: "wrap",
        index: 0,
      }),
      after: state({
        parentId: "bp",
        index: 2,
      }),
    });

    temp = 0;

    expect(
      planNodeRevert([deleted, moved], current(bp, node("child", {}, { $parentId: "bp" })), options()).commands,
    ).toEqual([
      '+FrameNode undo0 parent="bp" index="1" name="Wrap";',
      '+FrameNode undo1 parent="undo0" index="1";',
      'MOVE child parent="undo0" index="0";',
    ]);
  });

  it("regression: a node deleted inside a node an earlier undo recreated goes under the new id, token included", () => {
    const deleted = step({
      id: "btn",
      change: "deleted",
      before: state({
        parentId: "card",
        index: 0,
        nodes: [
          snapshot({
            id: "btn",
            parentId: "card",
            index: 0,
            attributes: { fill: "var(--token-oldToken1)" },
          }),
        ],
      }),
    });
    const [aliased = deleted] = applyAliases(
      [deleted],
      new Map([
        ["card", "newCard01"],
        ["oldToken1", "newToken1"],
      ]),
    ) as NodeStep[];

    temp = 0;

    expect(planNodeRevert([aliased], current(node("newCard01", {})), options()).commands).toEqual([
      '+FrameNode undo0 parent="newCard01" index="0" fill="var(--token-newToken1)";',
    ]);
  });

  it("regression: a move within the same parent is undone by its index", () => {
    const moved = step({
      id: "card",
      change: "moved",
      before: state({
        parentId: "bp",
        index: 3,
      }),
      after: state({
        parentId: "bp",
        index: 0,
      }),
    });
    const now = current(bp, node("card", {}));

    now.placements.set("card", {
      parentId: "bp",
      index: 0,
    });

    expect(planNodeRevert([moved], now, options()).commands).toEqual(['MOVE card parent="bp" index="3";']);
  });
});
