import { expect, it } from "vitest";
import { runOperation } from "../src/operations/define.ts";
import { siteAudit } from "../src/operations/site/audits.ts";
import { createFakeRuntime } from "../src/testing/index.ts";
import type { SiteFinding } from "../src/types/site-checks.ts";
import { rollUp, topRules } from "../src/utils/site-audit.ts";

it("regression: the summary says which checks failed (seen: a full-looking summary over 4 failed checks)", async () => {
  const { runtime } = createFakeRuntime();
  const agent = runtime.agent;

  if (agent === null) {
    throw new Error("The fake runtime has an agent.");
  }

  Object.assign(agent, {
    serialize: async () => {
      throw new Error("Page not found: /");
    },
  });

  const audit = await runOperation(siteAudit, { runtime }, { layout: false });

  expect(audit.failed.length).toBeGreaterThan(0);
  expect(audit.summary).toMatch(/^\d+ checks? failed \(/);
});

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
    // The rules each check hit, so a layout roll-up names the same rules layout_audit does.
    rules: [
      {
        rule: "missing-alt",
        count: 2,
      },
      {
        rule: "h1-count",
        count: 1,
      },
      {
        rule: "title-length",
        count: 1,
      },
    ],
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
