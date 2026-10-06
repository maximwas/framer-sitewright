import { describe, expect, it } from "vitest";
import type { SerializedNode } from "../src/types/dsl.ts";
import { nodeToXml } from "../src/xml/node-to-xml.ts";
import { xmlToDsl } from "../src/xml/xml-to-dsl.ts";

// Shaped like live serialize() output (sandbox Hero, 30.09.2026).
const hero: SerializedNode = {
  type: "FrameNode",
  id: "AzQXwt390",
  name: "Hero",
  $parentId: "WQLkyLRf1",
  $groundNodeId: "WQLkyLRf1",
  $scopeId: "augiA20Il",
  $rect: {
    x: 24,
    y: 96,
    width: 1152,
    height: 534,
  },
  attributes: {
    layout: "stack",
    right: "null",
    stackWrapEnabled: false,
    "breakpoint.medium.gap": "12px",
    hoverEffect: { scale: 1.1 },
  },
  children: [
    {
      type: "RichTextNode",
      id: "q9nef13Ci",
      name: "Title",
      $parentId: "AzQXwt390",
      attributes: {
        textStylePreset: "Heading/H1",
        textAlignment: "start",
      },
      children: [
        {
          type: "TextBlock",
          id: "v:q9nef13Ci:0",
          attributes: { tag: "h1" },
          children: [
            {
              type: "TextRun",
              id: "v:q9nef13Ci:0:0",
              attributes: { text: 'Say "hi" & go ' },
            },
            {
              type: "TextRun",
              id: "v:q9nef13Ci:0:1",
              attributes: {
                text: "now",
                bold: true,
              },
            },
          ],
        },
      ],
    },
    {
      type: "FrameNode",
      id: "wJcqWZRG7",
      name: "Button",
      $truncated: true,
      $descendantCount: 3,
    },
  ],
};

let sequence = 0;
const tempIds = (base: string) => `${base}_${sequence++}`;

describe("XML: printing nodes", () => {
  it("implies positional text ids, keeps edge spaces in runs, flattens objects, drops noise", () => {
    expect(nodeToXml(hero)).toBe(
      [
        '<FrameNode id="AzQXwt390" name="Hero" layout="stack" stackWrapEnabled="false" breakpoint.medium.gap="12px" hoverEffect.scale="1.1" $parentId="WQLkyLRf1" $rect="x:24 y:96 width:1152 height:534">',
        '  <RichTextNode id="q9nef13Ci" name="Title" textStylePreset="Heading/H1">',
        '    <TextBlock tag="h1">',
        '      <TextRun>Say "hi" &amp; go </TextRun>',
        '      <TextRun bold="true">now</TextRun>',
        "    </TextBlock>",
        "  </RichTextNode>",
        '  <FrameNode id="wJcqWZRG7" name="Button" $truncated="true" $descendantCount="3" />',
        "</FrameNode>",
      ].join("\n"),
    );
  });

  it("regression: its own output written back only SETs the nodes it read, and never creates content", () => {
    const { commands } = xmlToDsl(nodeToXml(hero), tempIds);

    expect(commands).toEqual([
      'SET AzQXwt390 name="Hero" layout="stack" stackWrapEnabled="false" breakpoint.medium.gap="12px" hoverEffect.scale="1.1";',
      'SET q9nef13Ci name="Title" textStylePreset="Heading/H1";',
      'SET v:q9nef13Ci:0 tag="h1";',
      'SET v:q9nef13Ci:0:0 text="Say \\"hi\\" & go ";',
      'SET v:q9nef13Ci:0:1 bold="true" text="now";',
      'SET wJcqWZRG7 name="Button";',
    ]);
  });
});

describe("XML: writing nodes", () => {
  it("creates nested trees under their parent, with keys, text and runs; indentation is not text", () => {
    const { commands, keys } = xmlToDsl(
      `<FrameNode parent="WQLkyLRf1" key="hero" layout="stack" hoverEffect.scale="1.05">
        <RichTextNode textStylePreset="Heading/H1">
          Build   sites
          in Framer &amp; more
        </RichTextNode>
        <!-- a paragraph with a bold word -->
        <RichTextNode>
          <TextBlock tag="p">Plain and <TextRun bold="true">bold</TextRun> text</TextBlock>
        </RichTextNode>
      </FrameNode>
      <FrameNode parent="hero" key="footer" />`,
      tempIds,
    );

    expect(commands).toEqual([
      expect.stringMatching(/^\+FrameNode hero_\d+ parent="WQLkyLRf1" layout="stack" hoverEffect\.scale="1\.05";$/),
      expect.stringMatching(
        /^\+RichTextNode richText_\d+ parent="hero_\d+" textStylePreset="Heading\/H1" text="Build {3}sites in Framer & more";$/,
      ),
      expect.stringMatching(/^\+RichTextNode richText_\d+ parent="hero_\d+";$/),
      expect.stringMatching(/^\+TextBlock textBlock_\d+ parent="richText_\d+" tag="p";$/),
      expect.stringMatching(/^\+TextRun run_\d+ parent="textBlock_\d+" text="Plain and ";$/),
      expect.stringMatching(/^\+TextRun textRun_\d+ parent="textBlock_\d+" bold="true" text="bold";$/),
      expect.stringMatching(/^\+TextRun run_\d+ parent="textBlock_\d+" text=" text";$/),
      expect.stringMatching(/^\+FrameNode footer_\d+ parent="hero_\d+";$/),
    ]);
    expect(Object.keys(keys)).toEqual(["hero", "footer"]);
  });

  it("addresses an existing rich text's content by position: a key adds a block, $delete removes one", () => {
    const { commands } = xmlToDsl(
      `<RichTextNode id="q9nef13Ci">
        <TextBlock tag="h2">New title</TextBlock>
        <TextBlock key="more">More</TextBlock>
        <TextBlock $delete="true" />
      </RichTextNode>`,
      tempIds,
    );

    expect(commands).toEqual([
      'SET v:q9nef13Ci:0 tag="h2";',
      'SET v:q9nef13Ci:0:0 text="New title";',
      expect.stringMatching(/^\+TextBlock more_\d+ parent="q9nef13Ci";$/),
      expect.stringMatching(/^\+TextRun run_\d+ parent="more_\d+" text="More";$/),
      "DEL v:q9nef13Ci:2;",
    ]);
  });

  it("resolves @key anywhere in a value to that element's temp id, also for elements further down", () => {
    const { commands } = xmlToDsl(
      `<Variable name="Label" type="string" scope="@card" initialValue="Hi" key="label" />
      <ComponentNode key="card" name="Content/Card">
        <FrameNode name="Base" layout="stack">
          <RichTextNode text="var(--variable-@label)" />
        </FrameNode>
      </ComponentNode>
      <ComponentInstanceNode parent="page" component="@card" $control__label="write to me@example.com" />`,
      tempIds,
    );

    expect(commands[0]).toMatch(
      /^\+Variable label_\d+ name="Label" type="string" scope="card_\d+" initialValue="Hi";$/,
    );
    expect(commands[3]).toMatch(/text="var\(--variable-label_\d+\)"/);
    expect(commands[4]).toMatch(/component="card_\d+" \$control__label="write to me@example.com";$/);
  });

  it("refuses malformed XML and what it cannot write, saying where", () => {
    const fails = (xml: string) => () => xmlToDsl(xml, tempIds);

    expect(fails('<FrameNode parent="p" gap=24px />')).toThrow(/line 1, column 27: The value of gap needs quotes/);
    expect(fails('<FrameNode parent="p">\n  <FrameNode>\n</FrameNode>')).toThrow(
      /line 1, column 1: <FrameNode> is not/,
    );
    expect(fails('<FrameNode parent="p" /></RichTextNode>')).toThrow(/column 25: <\/RichTextNode> closes nothing/);
    expect(fails('<FrameNode parent="p"></RichTextNode>')).toThrow(/Expected <\/FrameNode>.*found <\/RichTextNode>/);
    expect(fails('<RichTextNode parent="p">Tom & Jerry</RichTextNode>')).toThrow(/write & as &amp;/);
    expect(fails('<FrameNode parent="p" gap="1px" gap="2px" />')).toThrow(/gap is given twice/);
    expect(fails('<FrameNode parent="p">Loose text</FrameNode>')).toThrow(/Text cannot go inside FrameNode/);
    expect(fails('<FrameNode parent="p"><FrameNode id="AzQXwt390" /></FrameNode>')).toThrow(/cannot go inside a new/);
    expect(fails('<RichTextNode parent="p">Hi <TextRun bold="true">there</TextRun></RichTextNode>')).toThrow(/mixed/);
    expect(fails('<FrameNode parent="p" key="a" /><FrameNode parent="p" key="a" />')).toThrow(/key "a" must be unique/);
  });

  it("regression: a variable written after the text it binds is created before that text", () => {
    const { commands } = xmlToDsl(
      [
        '<ComponentNode key="card" name="Card">',
        '  <FrameNode key="primary" name="Default"><RichTextNode text="var(--variable-@label)" /></FrameNode>',
        "</ComponentNode>",
        '<Variable key="label" name="Label" type="string" scope="@card" initialValue="Hi" />',
      ].join("\n"),
      (base) => base,
    );
    const variable = commands.findIndex((command) => command.startsWith("+Variable"));
    const text = commands.findIndex((command) => command.includes("var(--variable-label)"));
    const component = commands.findIndex((command) => command.startsWith("+ComponentNode"));

    expect(component).toBeLessThan(variable);
    expect(variable).toBeLessThan(text);
  });

  it("regression: a list read back as JSON is written item by item, numbers unquoted (seen: a scroll effect's sections)", () => {
    const { commands } = xmlToDsl(
      '<RichTextNode id="a1" styleTransformEffect.sections="[{&quot;opacity&quot;:0.15,&quot;scale&quot;:1},{}]" $control__slides="[&quot;s1&quot;,&quot;s2&quot;]" />',
      tempIds,
    );

    expect(commands).toEqual([
      'SET a1 styleTransformEffect.sections.0.opacity=0.15 styleTransformEffect.sections.0.scale=1 $control__slides.0="s1" $control__slides.1="s2";',
    ]);
  });
});
