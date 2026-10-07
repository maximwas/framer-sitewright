import { expect, it } from "vitest";
import { sectionXml } from "../src/utils/section-xml.ts";

it("builds a section in the site's styles: its text styles and tokens, explicit stack alignment, one content width", () => {
  const xml = sectionXml(
    {
      kind: "features",
      parentId: "main",
      heading: "What changes",
      items: [
        {
          title: "Fewer calls",
          text: "Orders come in one form.",
        },
      ],
    },
    {
      heading: "Heading/H2",
      body: "Body/Default",
      ink: "ink",
      muted: "muted",
      surface: "card",
      maxWidth: "1200px",
    },
  );

  expect(xml).toContain('<FrameNode parent="main" key="section" name="Features"');
  expect(xml).toContain('maxWidth="1200px"');
  expect(xml).toContain(
    '<RichTextNode name="Heading" width="1fr" textStylePreset="Heading/H2" textColor="var(--token-ink)">What changes</RichTextNode>',
  );
  expect(xml).toContain('gridRowHeightType="auto"');
  expect(xml).toContain('fill="var(--token-card)"');
  expect(xml.match(/layout="stack"/g)?.length).toBe(xml.match(/stackAlignment=/g)?.length);
});
