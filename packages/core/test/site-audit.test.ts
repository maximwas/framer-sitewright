import { expect, it } from "vitest";
import type { SiteFinding } from "../src/types/site-checks.ts";
import { rollUp, topRules } from "../src/utils/site-audit.ts";

const finding = (rule: string, severity: SiteFinding["severity"], page: string): SiteFinding => ({
  rule,
  severity,
  page,
  nodeId: null,
  nodeName: null,
  message: "",
  fix: "",
});

it("counts a check's findings by severity and names the pages with the most", () => {
  const findings = [
    finding("missing-alt", "defect", "/about"),
    finding("missing-alt", "defect", "/about"),
    finding("title-length", "likely", "/"),
    finding("h1-count", "taste", "/blog"),
  ];

  expect(rollUp("seo", findings)).toEqual({
    check: "seo",
    defects: 2,
    likely: 1,
    taste: 1,
    worstPages: [
      {
        page: "/about",
        count: 2,
      },
      {
        page: "/",
        count: 1,
      },
      {
        page: "/blog",
        count: 1,
      },
    ],
  });
  expect(topRules(findings)[0]).toEqual({
    rule: "missing-alt",
    count: 2,
  });
});
