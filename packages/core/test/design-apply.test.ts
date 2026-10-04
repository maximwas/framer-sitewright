import { describe, expect, it } from "vitest";
import { deferAbsoluteCentering } from "../src/dsl/absolute-centering.ts";
import { deferIconInitialValues } from "../src/dsl/icon-variables.ts";
import { HistoryRecorder } from "../src/history/recorder.ts";
import { runOperation } from "../src/operations/define.ts";
import { designApply } from "../src/operations/design/apply.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

describe("design.apply", () => {
  it("moves an icon variable's initialValue to a SET and leaves other DSL as written", () => {
    const dsl =
      '+IconVariable v1 name="Icon" set="lucide" scope="comp" initialValue="Shopping Bag";\nSET node name="x";';

    expect(deferIconInitialValues(dsl)).toBe(
      '+IconVariable v1 name="Icon" set="lucide" scope="comp";\nSET v1 initialValue="Shopping Bag";\nSET node name="x";',
    );
    expect(deferIconInitialValues('+Variable v1 name="Text" type="string" scope="comp" initialValue="Hi";')).toBe(
      '+Variable v1 name="Text" type="string" scope="comp" initialValue="Hi";',
    );
  });

  it("regression: returns variables' real ids under their keys, and an icon variable gets its initial icon", async () => {
    const { runtime, state } = createFakeRuntime();

    state.serializedNodes.comp = {
      type: "ComponentNode",
      id: "comp",
      variables: [
        {
          id: "var-old",
          name: "Label",
        },
      ],
    };

    const result = await runOperation(
      designApply,
      { runtime },
      {
        xml: [
          '<Variable key="label" name="Label" type="string" scope="comp" initialValue="Go" />',
          '<IconVariable key="icon" name="Icon" set="lucide" scope="comp" initialValue="Shopping Bag" />',
        ].join("\n"),
      },
    );
    const variables = (state.serializedNodes.comp as { variables: { id: string; initialValue?: string }[] }).variables;

    expect(result.ok).toBe(true);
    expect(result.keys).toEqual({
      label: variables[1]?.id,
      icon: variables[2]?.id,
    });
    expect(variables[2]?.initialValue).toBe("Shopping Bag");
  });

  it("regression: a SET on a variable finds it after a reconnect, when its component is not loaded yet", async () => {
    const { runtime, state } = createFakeRuntime();

    state.components = [
      {
        id: "card",
        name: "Card",
        componentName: null,
      },
    ];
    state.serializedNodes.card = {
      type: "ComponentNode",
      id: "card",
      variables: [
        {
          id: "icon-var",
          name: "Icon",
          initialValue: "Shield",
        },
      ],
    };
    state.unloadedScopes = ["card"];

    const result = await runOperation(designApply, { runtime }, { dsl: 'SET icon-var initialValue="Prism";' });
    const variables = (state.serializedNodes.card as { variables: { initialValue?: string }[] }).variables;

    expect(result.ok).toBe(true);
    expect(variables[0]?.initialValue).toBe("Prism");
  });

  it("creates a centred absolute layer with a temporary pin and drops it right after", () => {
    expect(
      deferAbsoluteCentering(
        '+FrameNode glow parent="bg" position="absolute" left="null" centerAnchorX="50%" bottom="0px" width="200%";',
      ),
    ).toBe(
      '+FrameNode glow parent="bg" position="absolute" centerAnchorX="50%" bottom="0px" width="200%" left="0px";\nSET glow left="null";',
    );

    // A pinned axis, or a layer that is not absolute, stays as written.
    const pinned = '+FrameNode a position="absolute" left="8px" centerAnchorX="50%" top="0px";';

    expect(deferAbsoluteCentering(pinned)).toBe(pinned);
  });

  it("regression: warns that Framer ignores a project vector-set icon written to an instance's icon control", async () => {
    const { runtime, state } = createFakeRuntime();

    state.iconSets = [
      {
        id: "client-icons",
        displayName: "Client icons",
        group: "project",
        icons: ["Shield"],
        controls: null,
      },
      {
        id: "lucide",
        displayName: "Lucide",
        group: "external",
        icons: ["Heart"],
        controls: null,
      },
    ];
    state.componentControls = {
      card: {
        controls: {
          $control__icon: {
            type: "icon",
            set: "client-icons",
          },
          $control__title: {
            type: "string",
          },
        },
      },
      button: {
        controls: {
          $control__icon: {
            type: "icon",
            set: "lucide",
          },
        },
      },
    };
    state.serializedNodes.inst = {
      type: "ComponentInstanceNode",
      id: "inst",
      component: "card",
    };
    state.serializedNodes.btn = {
      type: "ComponentInstanceNode",
      id: "btn",
      component: "button",
    };
    state.nextApplyResult = {
      message: "Commands applied cleanly.",
      renamedIds: {},
    };

    const result = await runOperation(
      designApply,
      { runtime },
      { dsl: 'SET inst $control__icon="Shield" $control__title="Hi";\nSET btn $control__icon="Heart";' },
    );

    expect(result.warnings).toEqual([
      expect.objectContaining({
        targets: ["inst"],
        message: expect.stringContaining('$control__icon="Shield"'),
      }),
    ]);
  });

  it("regression: a batch Framer applied succeeds even when the icon check after it fails", async () => {
    const { runtime, state } = createFakeRuntime();

    state.serializedNodes.inst = {
      type: "ComponentInstanceNode",
      id: "inst",
      component: "card",
    };
    state.nextApplyResult = {
      message: "Commands applied cleanly.",
      renamedIds: {},
    };

    const agent = runtime.agent;

    if (agent === null) {
      throw new Error("unreachable");
    }

    const result = await runOperation(
      designApply,
      {
        runtime: {
          ...runtime,
          agent: {
            ...agent,
            listIconSets: async () => {
              throw new Error("timeout");
            },
          },
        },
      },
      { dsl: 'SET inst $control__icon="Heart";' },
    );

    expect(result.ok).toBe(true);
  });

  it("regression: says undo keeps the variables a batch created, instead of passing them over", async () => {
    const { runtime, state } = createFakeRuntime();
    const history = new HistoryRecorder();

    state.serializedNodes.comp = {
      type: "ComponentNode",
      id: "comp",
      variables: [],
    };

    await runOperation(
      designApply,
      {
        runtime,
        history,
      },
      { xml: '<Variable key="label" name="Label" type="string" scope="comp" initialValue="Go" />' },
    );

    expect(history.incomplete).toMatch(/1 variable created: undo does not remove variables/);
  });

  it("warns about fractional px, so sizes copied from a design come out whole", async () => {
    const { runtime, state } = createFakeRuntime();

    state.serializedNodes.img = {
      type: "FrameNode",
      id: "img",
    };
    state.nextApplyResult = {
      message: "Commands applied cleanly.",
      renamedIds: {},
    };

    const result = await runOperation(
      designApply,
      { runtime },
      {
        dsl: 'SET img maxWidth="569.15px" height="493px" fill="radial-gradient(50% 50% at 50% 50%, red 0%, blue 100%)";',
      },
    );

    expect(result.warnings).toEqual([
      {
        message: expect.stringContaining('maxWidth="569.15px"'),
        targets: ["img"],
      },
    ]);
  });
});
