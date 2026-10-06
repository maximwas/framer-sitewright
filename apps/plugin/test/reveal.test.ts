import { expect, it } from "vitest";
import { revealNode } from "../src/framer/reveal.ts";
import type { RevealEditor } from "../src/types/reveal.ts";

it("regression: opens the component that holds a layer Framer cannot open itself (seen: a variant of a header)", async () => {
  const opened: string[] = [];
  const notes: string[] = [];
  const editor: RevealEditor = {
    navigateTo: async (id) => {
      if (id !== "header") {
        throw new Error("Node not found");
      }

      opened.push(id);
    },
    getParent: async (id) => (id === "phone-open" ? { id: "header" } : null),
    getNode: async (id) => ({
      id,
      name: id === "phone-open" ? "Phone Open" : "Navigation/Header",
    }),
    notify: (message) => {
      notes.push(message);
    },
  };

  await revealNode(editor, "phone-open");

  expect(opened).toEqual(["header"]);
  expect(notes).toEqual(["Opened Navigation/Header, which holds Phone Open."]);
});
