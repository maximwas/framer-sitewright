import { expect, it } from "vitest";
import { componentInstances } from "../src/operations/components/instances.ts";
import { runOperation } from "../src/operations/define.ts";
import { nodesQuery } from "../src/operations/nodes/query.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

const pluginOnly = {
  withAgent: false,
  transport: "plugin",
} as const;

function fixture() {
  return createFakeRuntime(
    {
      canvas: [
        {
          id: "faded",
          parentId: "breakpoint-desktop",
          className: "FrameNode",
          name: "Faded",
          attributes: { opacity: 0.4 },
        },
        {
          id: "solid",
          parentId: "breakpoint-desktop",
          className: "FrameNode",
          name: "Solid",
          attributes: { opacity: 1 },
        },
        {
          id: "card-1",
          parentId: "breakpoint-desktop",
          className: "ComponentInstanceNode",
          name: "Card",
          attributes: {
            componentIdentifier: "local-module:canvasComponent/cmp9:default",
            componentName: "Content/Card",
          },
        },
        {
          id: "button-1",
          parentId: "breakpoint-desktop",
          className: "ComponentInstanceNode",
          name: "Button",
          attributes: {
            componentIdentifier: "local-module:canvasComponent/btn2:default",
            componentName: "Button",
          },
        },
      ],
    },
    pluginOnly,
  );
}

it("finds layers whose attributes meet every condition, comparing numbers as numbers", async () => {
  const { runtime } = fixture();
  const found = await runOperation(
    nodesQuery,
    { runtime },
    {
      where: [
        {
          attribute: "opacity",
          op: "lessThan",
          value: "1",
        },
      ],
    },
  );

  expect(found.matches.map(({ id }) => id)).toEqual(["faded"]);
  expect(found.matches[0]?.attributes).toMatchObject({ opacity: "0.4" });
});

it("lists every instance of a component by its id or name, with the page it is on", async () => {
  const { runtime } = fixture();

  for (const component of ["cmp9", "content/card"]) {
    const found = await runOperation(componentInstances, { runtime }, { component });

    expect(found.instances).toEqual([
      {
        id: "card-1",
        name: "Card",
        page: "/",
        component: "Content/Card",
      },
    ]);
  }
});
