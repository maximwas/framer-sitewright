import { describe, expect, it } from "vitest";
import { addNode, setNode } from "../src/dsl/commands.ts";
import { dslId, dslKey, dslString } from "../src/dsl/escape.ts";

describe("DSL escaping", () => {
  it("escapes only quotes and keeps backslashes literal (Framer does not unescape them)", () => {
    expect(dslString('Say "hi" a\\b')).toBe('"Say \\"hi\\" a\\b"');
  });

  it("rejects values Framer would silently repair or misparse", () => {
    expect(() => dslString("line1\nline2")).toThrow(/line breaks/);
    expect(() => dslString("ends with\\")).toThrow(/backslash/);
    expect(() => dslId('x" y')).toThrow(/Invalid node id/);
    expect(() => dslKey("bad key")).toThrow(/Invalid attribute/);
  });
});

describe("DSL commands", () => {
  it("skips undefined attributes and writes null as the string null", () => {
    expect(
      addNode("ColorStyleTokenNode", "t1", {
        name: "Brand/Primary",
        light: "rgb(1, 2, 3)",
        dark: undefined,
      }),
    ).toBe('+ColorStyleTokenNode t1 name="Brand/Primary" light="rgb(1, 2, 3)";');
    expect(
      setNode("abc", {
        dark: null,
        fontWeight: 700,
      }),
    ).toBe('SET abc dark="null" fontWeight="700";');
  });

  it("refuses a SET without attributes", () => {
    expect(() => setNode("abc", { light: undefined })).toThrow(/at least one attribute/);
  });
});
