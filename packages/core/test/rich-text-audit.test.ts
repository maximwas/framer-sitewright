import { expect, it } from "vitest";
import { runOperation } from "../src/operations/define.ts";
import { richTextAudit } from "../src/operations/site/audits.ts";
import { createFakeRuntime } from "../src/testing/index.ts";

it("regression: finds type and colors set inline inside rich text, read from the serialized attributes", async () => {
  // Seen: the audit read values beside attributes, where serialize() never puts them, and found nothing.
  const { runtime } = createFakeRuntime({
    layers: {
      "page-home": [
        {
          type: "RichTextNode",
          id: "title",
          attributes: {
            textStylePreset: "Heading 1",
            textColor: "var(--token-ink)",
          },
        },
        {
          type: "TextRun",
          id: "v:title:0:0",
          attributes: {
            fontSize: "40px",
            textColor: "#ff0000",
          },
        },
      ],
    },
  });

  const { findings } = await runOperation(richTextAudit, { runtime }, {});

  expect(findings.map(({ rule, nodeId }) => `${rule} ${nodeId}`)).toEqual([
    "inline-type v:title:0:0",
    "raw-text-color v:title:0:0",
  ]);
});
