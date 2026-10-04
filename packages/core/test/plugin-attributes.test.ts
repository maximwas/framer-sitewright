import { describe, expect, it } from "vitest";
import { fromPluginNode, toPluginAttributes } from "../src/plugin-nodes/attributes.ts";
import type { ColorStyleHandle, TextStyleHandle } from "../src/types/framer-port.ts";

const brand = {
  id: "tok-brand",
  name: "Primary",
  path: "/Brand/Primary",
} as unknown as ColorStyleHandle;
const display = {
  id: "style-display",
  name: "Display",
  path: "/Display",
} as unknown as TextStyleHandle;
const bodyA = {
  id: "style-a",
  name: "Body",
  path: "/A/Body",
} as unknown as TextStyleHandle;
const bodyB = {
  id: "style-b",
  name: "Body",
  path: "/B/Body",
} as unknown as TextStyleHandle;
const styles = {
  colors: [brand],
  texts: [display, bodyA, bodyB],
};

describe("DSL attributes for the Plugin API", () => {
  it("converts what the Plugin API has, tokens and text styles as the project's objects", () => {
    const frame = toPluginAttributes(
      "FrameNode",
      {
        fill: "var(--token-tok-brand)",
        radius: "12px",
        border: "1px solid rgba(0, 0, 0, 0.1)",
        width: "auto",
        height: "1fr",
        minWidth: "320",
        rotation: "15deg",
        opacity: "0.5",
        layout: "stack",
        gap: "16px",
        gridColumnWidth: "240px",
        "link.openInNewTab": "true",
        top: "null",
      },
      styles,
    );

    expect(frame).toEqual({
      attributes: {
        backgroundColor: brand,
        borderRadius: "12px",
        border: {
          width: "1px",
          style: "solid",
          color: "rgba(0, 0, 0, 0.1)",
        },
        width: "fit-content",
        height: "1fr",
        minWidth: "320px",
        rotation: 15,
        opacity: 0.5,
        layout: "stack",
        gap: "16px",
        gridColumnWidth: 240,
        linkOpenInNewTab: true,
        top: null,
      },
      text: null,
      unsupported: [],
      invalid: [],
    });

    const text = toPluginAttributes(
      "RichTextNode",
      {
        text: "Hello",
        textStylePreset: "Display",
      },
      styles,
    );

    expect(text.attributes).toEqual({ inlineTextStyle: display });
    expect(text.text).toBe("Hello");
  });

  it("reports what needs the DSL, and values the Plugin API cannot take", () => {
    const frame = toPluginAttributes(
      "FrameNode",
      {
        "appearEffect.trigger": "onInView",
        textColor: "#000000",
        fill: "linear-gradient(90deg, #fff 0%, #000 100%)",
        opacity: "half",
      },
      styles,
    );

    expect(frame.unsupported).toEqual(["appearEffect.trigger", "textColor"]);
    expect(frame.invalid).toHaveLength(2);
    expect(frame.invalid[0]).toContain("Server API key");

    // Two styles share the name: only the full path picks one.
    expect(toPluginAttributes("RichTextNode", { textStylePreset: "Body" }, styles).invalid).toHaveLength(1);
    expect(toPluginAttributes("RichTextNode", { textStylePreset: "B/Body" }, styles).attributes).toEqual({
      inlineTextStyle: bodyB,
    });
    // A frame has no text style, a text no fill.
    expect(toPluginAttributes("RichTextNode", { fill: "#fff" }, styles).unsupported).toEqual(["fill"]);
  });

  it("takes an image fill by URL to upload, and reads an image fill back as the DSL writes it", () => {
    const url = "https://framerusercontent.com/images/photo.jpg";

    expect(toPluginAttributes("FrameNode", { fill: url }, styles).attributes).toEqual({
      backgroundColor: { imageUrl: url },
    });
    expect(
      fromPluginNode(
        {
          __class: "FrameNode",
          id: "f1",
          backgroundColor: null,
          backgroundImage: { url },
        },
        null,
      ).attributes.fill,
    ).toBe(url);
  });
});

describe("Plugin API nodes as the DSL prints them", () => {
  it("names tokens and styles the DSL way and leaves defaults out", () => {
    expect(
      fromPluginNode(
        {
          __class: "FrameNode",
          name: "Card",
          visible: true,
          opacity: 1,
          rotation: 0,
          backgroundColor: brand,
          border: {
            width: "1px",
            style: "solid",
            color: brand,
          },
          borderRadius: "12px",
          width: "fit-content",
          height: "200px",
          layout: "stack",
          stackWrapEnabled: false,
          position: "absolute",
          top: "10px",
          left: "20px",
        },
        null,
      ),
    ).toEqual({
      type: "FrameNode",
      attributes: {
        fill: "var(--token-tok-brand)",
        border: "1px solid var(--token-tok-brand)",
        radius: "12px",
        width: "auto",
        height: "200px",
        layout: "stack",
        position: "absolute",
        top: "10px",
        left: "20px",
      },
    });
  });

  it("shows a child of a stack as the DSL does: relative, without pins", () => {
    expect(
      fromPluginNode(
        {
          __class: "TextNode",
          inlineTextStyle: display,
          position: "absolute",
          top: "0px",
          left: "0px",
          width: "fit-content",
        },
        "stack",
      ),
    ).toEqual({
      type: "RichTextNode",
      attributes: {
        textStylePreset: "Display",
        position: "relative",
        width: "auto",
      },
    });
  });
});
