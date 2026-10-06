import { expect, it } from "vitest";
import { isolateTempIds } from "../src/dsl/temp-ids.ts";

it("regression: gives the temp ids a raw batch creates names of its own, so another agent's q2 is never touched", () => {
  // Seen: agents sharing one Server API session both used q2, and SET q2 would have changed the other one's layer.
  const { dsl, created } = isolateTempIds(
    [
      '+FrameNode q2 parent="AbDvD4kXp" name="Card";',
      'SET q2 fill="#ffffff";',
      '+Variable v1 name="Title" type="string" scope="q2";',
      'SET t1 text="var(--variable-v1)";',
      'DUPE q2 newId="q3";',
      'SET q3 visible="false";',
      'SET older name="from an earlier batch";',
    ].join("\n"),
    (base) => `${base}_s1`,
  );

  expect(dsl).toBe(
    [
      '+FrameNode q2_s1 parent="AbDvD4kXp" name="Card";',
      'SET q2_s1 fill="#ffffff";',
      '+Variable v1_s1 name="Title" type="string" scope="q2_s1";',
      'SET t1 text="var(--variable-v1_s1)";',
      'DUPE q2_s1 newId="q3_s1";',
      'SET q3_s1 visible="false";',
      'SET older name="from an earlier batch";',
    ].join("\n"),
  );
  expect(created).toEqual({
    q2: "q2_s1",
    v1: "v1_s1",
    q3: "q3_s1",
  });
});

it("regression: renames a compound id made of two temp ids of the batch (seen: SET rv…box… was refused)", () => {
  // A variant created in the batch and a node created in it: their override is addressed by both ids together.
  const { dsl } = isolateTempIds(
    ['CREATE_VARIANT rv from="AbDvD4kXp";', '+FrameNode box parent="AbDvD4kXp";', 'SET rvbox fill="#ffffff";'].join(
      "\n",
    ),
    (base) => `${base}_s1`,
  );

  expect(dsl).toContain('SET rv_s1box_s1 fill="#ffffff";');
});
