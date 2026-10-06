import { describe, expect, it } from "vitest";
import { HistoryRecorder } from "../src/history/recorder.ts";
import { runOperation } from "../src/operations/define.ts";
import { textReplace } from "../src/operations/nodes/text-replace.ts";
import { createFakeRuntime } from "../src/testing/index.ts";
import type { SerializedNode } from "../src/types/dsl.ts";
import type { FakeFramerState } from "../src/types/testing.ts";
import { replaceFormatting, spellingsToSend } from "../src/utils/text-replace.ts";

function run(text: string, attributes: Record<string, unknown> = {}) {
  return {
    type: "TextRun",
    id: `run-${text}`,
    attributes: {
      text,
      ...attributes,
    },
  };
}

function richText(id: string, ...runs: ReturnType<typeof run>[]): SerializedNode {
  return {
    type: "RichTextNode",
    id,
    attributes: {},
    children: [
      {
        type: "TextBlock",
        id: `v:${id}:0`,
        attributes: { tag: "p" },
        children: runs,
      },
    ],
  };
}

// A headline with a bold word, and its copies on two breakpoints: the tablet's holds its own text, the phone's follows
// the primary (live, 06.10.2026: copies are replicas with compound ids, `<breakpoint id><original id>`).
const project = (): Partial<FakeFramerState> => ({
  canvas: [
    {
      id: "title",
      parentId: "breakpoint-desktop",
      className: "TextNode",
      name: null,
      text: "Book a call",
    },
    {
      id: "breakpoint-tablettitle",
      parentId: "breakpoint-tablet",
      className: "TextNode",
      name: null,
      text: "Call us",
      originalId: "title",
    },
    {
      id: "breakpoint-phonetitle",
      parentId: "breakpoint-phone",
      className: "TextNode",
      name: null,
      originalId: "title",
    },
  ],
  serializedNodes: {
    title: richText("title", run("Book a "), run("call", { bold: true })),
    "breakpoint-tablettitle": richText("breakpoint-tablettitle", run("Call us")),
  },
});

const texts = (state: FakeFramerState) => Object.fromEntries(state.canvas.map(({ id, text }) => [id, text ?? null]));

it("replaces in place through framer.agent, keeping formatting, in the primary and in copies with their own text", async () => {
  const { runtime, state } = createFakeRuntime(project());
  const input = {
    find: "call",
    replace: "visit",
  };
  const preview = await runOperation(
    textReplace,
    { runtime },
    {
      ...input,
      dryRun: true,
    },
  );

  // The phone's copy follows the primary, so it is not a change of its own.
  expect(preview).toEqual({
    replaced: 0,
    changes: [
      {
        id: "title",
        page: "/",
        breakpoint: null,
        before: "Book a call",
        after: "Book a visit",
        formatting: "kept",
      },
      {
        id: "breakpoint-tablettitle",
        page: "/",
        breakpoint: "Tablet",
        before: "Call us",
        after: "visit us",
        formatting: "kept",
      },
    ],
    failed: [],
  });

  const history = new HistoryRecorder();
  const replaced = await runOperation(
    textReplace,
    {
      runtime,
      history,
    },
    input,
  );

  expect(replaced).toMatchObject({
    replaced: 2,
    failed: [],
  });
  expect(state.appliedDsl).toEqual([]);
  expect(texts(state)).toEqual({
    title: "Book a visit",
    "breakpoint-tablettitle": "visit us",
    "breakpoint-phonetitle": null,
  });
  expect(history.incomplete).toBeNull();
  // Undo rebuilds each text from its content before: the bold run comes back bold.
  expect(history.steps).toMatchObject([
    {
      id: "title",
      change: "updated",
      before: {
        nodes: expect.arrayContaining([
          expect.objectContaining({
            attributes: {
              text: "call",
              bold: true,
            },
          }),
        ]),
      },
    },
    {
      id: "breakpoint-tablettitle",
      change: "updated",
    },
  ]);
});

it("without a key rewrites the layers as plain text through design_apply, and says so per match", async () => {
  const { runtime, state } = createFakeRuntime(project(), {
    withAgent: false,
    transport: "plugin",
  });
  const result = await runOperation(
    textReplace,
    { runtime },
    {
      find: "call",
      replace: "visit",
    },
  );

  expect(result.changes.map(({ id, formatting }) => [id, formatting])).toEqual([
    ["title", "plain"],
    ["breakpoint-tablettitle", "plain"],
  ]);
  expect(result.replaced).toBe(2);
  expect(texts(state)).toEqual({
    title: "Book a visit",
    "breakpoint-tablettitle": "visit us",
    "breakpoint-phonetitle": null,
  });
});

describe("in-place replace helpers", () => {
  it("says formatting is kept inside a run or across runs formatted alike, and only partly kept across others", () => {
    const text = richText("t", run("Book a "), run("call", { bold: true }), run(" now, call "), run("later"));

    expect(replaceFormatting(text, "CALL", false)).toBe("kept");
    expect(replaceFormatting(text, "call later", false)).toBe("kept");
    expect(replaceFormatting(text, "a call", false)).toBe("partial");
    expect(replaceFormatting(text, "call", true)).toBe("kept");
    expect(replaceFormatting(null, "call", false)).toBe("kept");
  });

  it("sends each spelling once, the one the replacement holds first, and refuses when it holds two", () => {
    expect(spellingsToSend("Call, call, CALL", "call", "visit", false)).toEqual(["Call", "call", "CALL"]);
    expect(spellingsToSend("Cat and cat", "cat", "cats", false)).toEqual(["cat", "Cat"]);
    expect(spellingsToSend("Cat and cat", "cat", "cats", true)).toEqual(["cat"]);
    expect(spellingsToSend("a A", "a", "aA", false)).toBeNull();
  });
});
