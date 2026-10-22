import { EventEmitter } from "node:events";
import { AGENT_CHANGED_EVENT } from "@sitewright/core";
import { describe, expect, it } from "vitest";
import type { PluginUiChannel } from "../src/types/transports.ts";
import type { UiServices } from "../src/types/ui-api.ts";
import { servePanels } from "../src/ui-api/serve-panels.ts";

describe("servePanels", () => {
  it("hands the plugin the layers a call of Claude's changed or read, and nothing for a call that named none", () => {
    const events: [string, unknown][] = [];
    const journal = new EventEmitter();
    const channel = {
      servePanels: () => undefined,
      notify: (name: string, data: unknown) => events.push([name, data]),
    } as unknown as PluginUiChannel;
    const state = {
      parentId: "page",
      index: 0,
      attributes: {},
      nodes: [],
      overrides: {},
    };

    servePanels(channel, {
      journal,
      journalDir: null,
    } as unknown as UiServices);
    journal.emit("appended", {
      id: "e1",
      seq: 1,
      title: "Design: 1 created",
      kind: "operation",
      steps: [
        {
          kind: "node",
          id: "hero",
          type: "FrameNode",
          name: "Hero",
          pagePath: "/",
          change: "created",
          before: null,
          after: state,
        },
      ],
    });
    journal.emit("appended", {
      id: "e2",
      seq: 2,
      title: "Read nodes",
      kind: "operation",
      effect: "read",
      steps: [],
      detail: {
        subject: "Card, depth 2",
        summary: null,
        nodes: [
          {
            id: "card",
            name: "Card",
          },
        ],
        images: [],
      },
    });
    journal.emit("appended", {
      id: "e3",
      seq: 3,
      title: "Find layers",
      kind: "operation",
      effect: "read",
      steps: [],
      detail: null,
    });

    expect(events.filter(([name]) => name === AGENT_CHANGED_EVENT)).toEqual([
      [AGENT_CHANGED_EVENT, { nodeIds: ["hero"] }],
      [AGENT_CHANGED_EVENT, { nodeIds: ["card"] }],
    ]);
  });
});
