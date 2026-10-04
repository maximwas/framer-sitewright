import { designApply, HistoryRecorder, historyRevert, nodesRead, requireAgent } from "@sitewright/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TransportRouter } from "../../src/transports/router.ts";
import { createIntegrationTransports, integrationConfig } from "./helpers.ts";

const config = integrationConfig();
const run = Date.now().toString(36);
const pagePath = "/";

interface Tree {
  readonly type: string;
  readonly name?: string;
  readonly attributes?: Record<string, unknown>;
  readonly children?: Tree[];
}

/** A subtree without ids and measurements: recreated nodes get new ids, so only what they look like is compared. */
function shape(node: Tree): unknown {
  const attributes = Object.fromEntries(
    Object.entries(node.attributes ?? {}).filter(([, value]) => value !== undefined),
  );

  return {
    type: node.type,
    name: node.name ?? null,
    attributes,
    children: (node.children ?? []).map(shape),
  };
}

describe.skipIf(config === null)("undo of raw DSL on the sandbox project", () => {
  let transports: TransportRouter;
  const created: string[] = [];

  const apply = async (dsl: string, history?: HistoryRecorder) => {
    const result = await transports.run(
      designApply,
      {
        dsl,
        pagePath,
      },
      history === undefined ? {} : { history },
    );

    expect(result.errors).toEqual([]);

    return result;
  };
  const read = (id: string) =>
    transports.withServerApi(
      async (runtime) =>
        (await requireAgent(runtime).serialize(
          {
            id,
            depth: 20,
          },
          { pagePath },
        )) as Tree,
    );

  beforeAll(async () => {
    if (config !== null) {
      transports = await createIntegrationTransports(config);
    }
  });

  afterAll(async () => {
    for (const id of created.reverse()) {
      await transports
        .run(designApply, {
          dsl: `DEL ${id};`,
          pagePath,
        })
        .catch(() => undefined);
    }

    await transports.close();
  });

  /** The home page's first breakpoint: new test sections go there. */
  const firstBreakpoint = async () => {
    const home = await transports.withServerApi(async (runtime) => {
      const pages = await runtime.port.getNodesWithType("WebPageNode");

      return pages.find((candidate) => candidate.path === "/")?.id ?? "";
    });

    return ((await read(home)).children?.[0] as { id: string } | undefined)?.id ?? "";
  };

  it("undoes and redoes sets, text, a new node, a move and deletions, replica overrides included", async () => {
    const breakpoint = await firstBreakpoint();
    const setup = await apply(
      [
        `+FrameNode sec${run} parent="${breakpoint}" name="undo ${run}" layout="stack" stackDirection="vertical" gap="8px" padding="16px" width="1fr" height="auto" fill="rgb(240, 240, 240)";`,
        `+RichTextNode txt${run} parent="sec${run}" text="Original text";`,
        `+FrameNode nest${run} parent="sec${run}" name="Nest" layout="stack" width="1fr" height="auto";`,
        `+FrameNode mv${run} parent="sec${run}" name="Mover" width="40px" height="40px" fill="rgb(0, 0, 255)";`,
        `+FrameNode gone${run} parent="sec${run}" name="Gone" layout="stack" width="1fr" height="auto" padding="8px";`,
        `+RichTextNode gonetxt${run} parent="gone${run}" text="Deleted text" fontWeight="700";`,
        `+ComponentNode comp${run} name="undo comp ${run}";`,
        `+FrameNode pv${run} parent="comp${run}" name="Primary" layout="stack" width="200px" height="auto" padding="8px";`,
        `+RichTextNode lbl${run} parent="pv${run}" text="Label";`,
        `+FrameNode box${run} parent="pv${run}" name="Box" width="40px" height="40px" fill="rgb(0, 128, 0)";`,
        `CREATE_VARIANT rv${run} from="pv${run}";`,
        `SET rv${run} name="Wide" left="260px";`,
        `SET rv${run}box${run} fill="rgb(128, 0, 0)";`,
      ].join("\n"),
    );
    const id = (temp: string) => setup.renamedIds[`${temp}${run}`] ?? "";

    created.push(id("comp"), id("sec"));

    const beforeSection = shape(await read(id("sec")));
    const beforeComponent = shape(await read(id("comp")));
    const history = new HistoryRecorder();

    await apply(
      [
        `SET ${id("sec")} fill="rgb(1, 2, 3)" maxWidth="1080px";`,
        `SET ${id("txt")} text="Changed text";`,
        `+FrameNode add${run} parent="${id("sec")}" name="Added" width="10px" height="10px";`,
        `MOVE ${id("mv")} parent="${id("nest")}" index="0";`,
        `DEL ${id("gone")};`,
        `SET ${id("rv")}${id("lbl")} fontSize="22px";`,
        `DEL ${id("box")};`,
      ].join("\n"),
      history,
    );

    expect(history.incomplete).toBeNull();
    expect(history.steps.map((step) => (step.kind === "node" ? step.change : step.kind))).toEqual([
      "updated",
      "updated",
      "created",
      "moved",
      "deleted",
      "updated",
      "deleted",
    ]);

    const afterSection = shape(await read(id("sec")));
    const afterComponent = shape(await read(id("comp")));
    const redo = new HistoryRecorder();
    const undone = await transports.run(historyRevert, { steps: [...history.steps] }, { history: redo });

    expect(undone.conflicts).toBe(0);
    expect(undone.results.every((result) => result.note === null)).toBe(true);
    expect(shape(await read(id("sec")))).toEqual(beforeSection);
    expect(shape(await read(id("comp")))).toEqual(beforeComponent);

    await transports.run(historyRevert, { steps: [...redo.steps] });

    expect(shape(await read(id("sec")))).toEqual(afterSection);
    expect(shape(await read(id("comp")))).toEqual(afterComponent);
  });

  it("writes a section as XML and reads it back as XML, which written back changes nothing", async () => {
    const breakpoint = await firstBreakpoint();
    const written = await transports.run(designApply, {
      xml: `<FrameNode parent="${breakpoint}" key="section" name="xml ${run}" layout="stack" stackDirection="vertical" gap="8px" width="1fr" height="auto">
        <RichTextNode name="Title">Hello &amp; welcome</RichTextNode>
        <RichTextNode name="Body">
          <TextBlock tag="p">Plain and <TextRun bold="true">bold</TextRun> text</TextBlock>
        </RichTextNode>
      </FrameNode>`,
      pagePath,
    });

    expect(written.errors).toEqual([]);

    const section = written.keys?.section ?? "";

    created.push(section);

    const { xml } = await transports.run(nodesRead, {
      nodeId: section,
      depth: 8,
      pagePath,
    });

    expect(xml).toContain("Hello &amp; welcome");
    expect(xml).toContain('<TextRun bold="true">bold</TextRun>');

    const before = shape(await read(section));
    const echo = new HistoryRecorder();
    const rewritten = await transports.run(
      designApply,
      {
        xml: xml ?? "",
        pagePath,
      },
      { history: echo },
    );

    expect(rewritten.errors).toEqual([]);
    expect(echo.steps).toEqual([]);
    expect(shape(await read(section))).toEqual(before);
  });

  it("records effects and shadows, and undoes a create-then-change chain from its first entry", async () => {
    const breakpoint = await firstBreakpoint();
    const first = new HistoryRecorder();
    const made = await transports.run(
      designApply,
      {
        xml: `<FrameNode parent="${breakpoint}" key="box" name="effects ${run}" layout="stack" width="200px" height="100px" fill="rgb(1, 2, 3)" appearEffect.trigger="onInView" appearEffect.enter.opacity="0" appearEffect.enter.y="24" appearEffect.enter.transition="tween 0.22,1,0.36,1 0.8s 0s" boxShadows.0="0px 8px 16px 0px rgba(0, 0, 0, 0.2)"><RichTextNode>Effects</RichTextNode></FrameNode>`,
        pagePath,
      },
      { history: first },
    );
    const box = made.keys?.box ?? "";

    created.push(box);
    expect(made.errors).toEqual([]);

    const second = new HistoryRecorder();

    await apply(
      `SET ${box} appearEffect="null" hoverEffect.scale="1.05" width="240px";\n+FrameNode child${run} parent="${box}" width="10px" height="10px";`,
      second,
    );

    const attributesOf = async () => (await read(box)).attributes ?? {};

    expect(await attributesOf()).toMatchObject({ hoverEffect: { scale: 1.05 } });

    // Undoing the change brings the appear effect back and drops the hover effect.
    const undone = await transports.run(historyRevert, { steps: [...second.steps] });

    expect(undone.conflicts).toBe(0);
    expect(await attributesOf()).toMatchObject({
      appearEffect: {
        trigger: "onInView",
        enter: { y: 24 },
      },
      boxShadows: ["0px 8px 16px 0px rgba(0, 0, 0, 0.2)"],
    });
    expect((await attributesOf()).hoverEffect).toBeUndefined();

    // Change it again (the undone change and its undo cancel out), then undo the first entry with everything after
    // it, in one revert, as activity_undo andLater does.
    const third = new HistoryRecorder();

    await apply(
      `SET ${box} appearEffect="null" hoverEffect.scale="1.05" width="240px";\n+FrameNode again${run} parent="${box}" width="10px" height="10px";`,
      third,
    );

    const steps = [...first.steps, ...third.steps];
    // The preview walks the same chain on its own copy: no false conflicts from changes it would undo first.
    const preview = await transports.run(historyRevert, {
      steps,
      dryRun: true,
    });

    expect(preview.conflicts).toBe(0);

    const chain = await transports.run(historyRevert, { steps });

    expect(chain.conflicts).toBe(0);
    expect((await read(breakpoint)).children?.some((child) => (child as { id?: string }).id === box)).toBe(false);
  });

  it("undoes a component with a variable, variants and an instance from its first entry, preview included", async () => {
    const breakpoint = await firstBreakpoint();
    const first = new HistoryRecorder();
    const made = await apply(
      [
        `+ComponentNode cmp${run} name="mcp-test/Chip ${run}";`,
        `+FrameNode cmpBase${run} parent="cmp${run}" name="Base" layout="stack" padding="8px 12px" radius="99px" fill="rgb(0, 0, 255)" width="auto" height="auto";`,
        `+Variable cmpLabel${run} name="Label" type="string" scope="cmp${run}" initialValue="Chip";`,
        `+RichTextNode cmpText${run} parent="cmpBase${run}" textColor="rgb(255, 255, 255)" width="auto" height="auto" text="var(--variable-cmpLabel${run})";`,
        `CREATE_VARIANT cmpAlt${run} from="cmpBase${run}";`,
        `SET cmpAlt${run} name="Alt" left="200px" fill="rgb(255, 0, 0)";`,
        `CREATE_VARIANT cmpHover${run} from="cmpBase${run}" gesture="hover";`,
        `SET cmpHover${run} top="80px" fill="rgb(0, 0, 128)";`,
      ].join("\n"),
      first,
    );
    const component = made.renamedIds[`cmp${run}`] ?? "";

    created.push(component);

    const second = new HistoryRecorder();
    const placed = await apply(
      `+ComponentInstanceNode inst${run} parent="${breakpoint}" component="${component}" $control__label="Hello" width="auto" height="auto";`,
      second,
    );
    const instance = placed.renamedIds[`inst${run}`] ?? "";

    created.push(instance);

    const third = new HistoryRecorder();

    await apply(`SET ${instance} $control__variant="Alt" $control__label="Changed";`, third);

    const steps = [...first.steps, ...second.steps, ...third.steps];
    const preview = await transports.run(historyRevert, {
      steps,
      dryRun: true,
    });

    expect(preview.results.filter((result) => result.outcome === "conflict")).toEqual([]);

    const chain = await transports.run(historyRevert, { steps });

    expect(chain.results.filter((result) => result.outcome === "conflict")).toEqual([]);
  });

  it("undoes an unwrap, a reorder within a parent and a rename exactly, and redoes them", async () => {
    const breakpoint = await firstBreakpoint();
    const setup = await apply(
      [
        `+FrameNode box${run} parent="${breakpoint}" name="unwrap ${run}" layout="stack" width="1fr" height="auto";`,
        `+FrameNode x${run} parent="box${run}" width="10px" height="10px";`,
        `+FrameNode wrap${run} parent="box${run}" name="Wrap" layout="stack" width="1fr" height="auto";`,
        `+FrameNode a${run} parent="wrap${run}" name="A" width="10px" height="10px";`,
        `+FrameNode b${run} parent="wrap${run}" name="B" width="10px" height="10px";`,
        `+FrameNode y${run} parent="box${run}" name="Y" width="10px" height="10px";`,
      ].join("\n"),
    );
    const id = (temp: string) => setup.renamedIds[`${temp}${run}`] ?? "";

    created.push(id("box"));

    const before = shape(await read(id("box")));
    const history = new HistoryRecorder();

    // Take A out of Wrap and drop Wrap (an unwrap), move Y to the front, name the unnamed X.
    await apply(
      [
        `MOVE ${id("a")} parent="${id("box")}" index="3";`,
        `DEL ${id("wrap")};`,
        `MOVE ${id("y")} parent="${id("box")}" index="0";`,
        `SET ${id("x")} name="Renamed";`,
      ].join("\n"),
      history,
    );

    expect(history.incomplete).toBeNull();

    const after = shape(await read(id("box")));
    const redo = new HistoryRecorder();
    const undone = await transports.run(historyRevert, { steps: [...history.steps] }, { history: redo });

    expect(undone.conflicts).toBe(0);
    expect(shape(await read(id("box")))).toEqual(before);

    await transports.run(historyRevert, { steps: [...redo.steps] });

    expect(shape(await read(id("box")))).toEqual(after);
  });
});
