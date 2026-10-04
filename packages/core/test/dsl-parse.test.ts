import { describe, expect, it } from "vitest";
import { parseDsl } from "../src/dsl/parse.ts";

describe("parseDsl", () => {
  it("splits at semicolons outside quotes, keeps escaped quotes and drops comments", () => {
    const commands = parseDsl(
      [
        '/** hero */ +RichTextNode title parent="bp" text="Say \\"hi\\"; then go";',
        'SET title width="1fr";\n/** move it */ MOVE title parent="box" index="0";',
        'DUPE card newId="card2" parent="bp";',
        'CREATE_VARIANT tablet from="bp"; DEL old;',
      ].join("\n"),
    );

    expect(commands.map(({ verb, type, id }) => [verb, type, id])).toEqual([
      ["ADD", "RichTextNode", "title"],
      ["SET", null, "title"],
      ["MOVE", null, "title"],
      ["DUPE", null, "card"],
      ["CREATE_VARIANT", null, "tablet"],
      ["DEL", null, "old"],
    ]);
    expect(commands[0]?.attributes).toEqual({
      parent: "bp",
      text: 'Say "hi"; then go',
    });
    expect(commands[3]?.attributes.newId).toBe("card2");
  });

  it("marks verbs the grammar does not have, and stray text, as UNKNOWN", () => {
    expect(parseDsl('RENAME x name="y"; SET x width;').map((command) => command.verb)).toEqual(["UNKNOWN", "UNKNOWN"]);
  });
});
