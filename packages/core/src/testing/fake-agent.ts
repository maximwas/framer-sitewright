import { DSL_VARIABLE_TYPE } from "../constants/dsl.ts";
import { LINK_STYLE_NODE_TYPE } from "../constants/link-styles.ts";
import { FAKE_MODELED_NODE_TYPES } from "../constants/testing.ts";
import { parseDsl } from "../dsl/parse.ts";
import type { DslCommand } from "../types/dsl.ts";
import type { AgentPort } from "../types/framer.ts";
import type { FakeAgentSession, FakeColorStyle, FakeFramerState, FakeTextStyle } from "../types/testing.ts";
import {
  assertLinkStyleUnused,
  linkStyleNode,
  newLinkStyle,
  referencedStyles,
  withLinkAttributes,
} from "./fake-link-styles.ts";
import {
  FakeCommandError,
  setSerializedAttributes,
  tokenColors,
  withTextStyleAttributes,
} from "./fake-node-attributes.ts";
import { canvasText, newTextStyle, stylePath } from "./fake-state.ts";

/** framer.agent over the fake state. Models color tokens, text and link styles; anything else is an error. */
export function createFakeAgent(state: FakeFramerState, nextId: (prefix: string) => string): AgentPort {
  const session: FakeAgentSession = {
    state,
    nextId,
    tempIds: new Map(),
  };

  return {
    getSystemPrompt: async () => state.systemPrompt,
    applyChanges: async (dsl) => {
      state.appliedDsl.push(dsl);

      if (state.nextApplyResult === undefined) {
        return applyDsl(dsl, session);
      }

      const result = state.nextApplyResult;

      state.nextApplyResult = undefined;

      return result;
    },
    serialize: async (input) => jsonCopy(state.serializedNodes[input.id] ?? null),
    serializeNodes: async ({ ids }) => {
      // Reading a scope loads it into the session: its variables become targets.
      state.unloadedScopes = state.unloadedScopes.filter((id) => !ids.includes(id));

      return jsonCopy(ids.flatMap((id) => state.serializedNodes[id] ?? []));
    },
    // The DSL's view of styles: token and preset nodes named by their path without the leading slash. Types the fake
    // does not model itself (the root, pages, layout templates) come from the serialized nodes.
    getNodesOfTypes: async ({ types }) => [
      ...(types.includes("ColorStyleTokenNode") ? state.colorStyles.map(dslNode) : []),
      ...(types.includes("TextStylePresetNode") ? state.textStyles.map(dslNode) : []),
      ...(types.includes(LINK_STYLE_NODE_TYPE) ? state.linkStyles.map(linkStyleNode) : []),
      ...(types.includes("ComponentNode")
        ? state.components.map(({ id, name, componentName }) => ({
            type: "ComponentNode",
            id,
            name: componentName ?? name,
          }))
        : []),
      ...(types.includes("DesignPageNode")
        ? state.designPages.map(({ id, name }) => ({
            type: "DesignPageNode",
            id,
            name,
          }))
        : []),
      ...jsonCopy(
        Object.values(state.serializedNodes).filter(
          (node) =>
            typeof node === "object" &&
            node !== null &&
            "type" in node &&
            types.includes(String(node.type)) &&
            !FAKE_MODELED_NODE_TYPES.includes(String(node.type)),
        ),
      ),
    ],
    getDescendantsOfTypes: async ({ id, types }) => (state.layers[id] ?? []).filter(({ type }) => types.includes(type)),
    getDescendantReferencesOfTypes: async ({ id, types }) =>
      referencedStyles(state, state.layers[id] ?? []).filter(({ type }) => types.includes(type)),
    // Like Framer: every exact match, inside the runs. A copy that showed its original's text now holds its own.
    replaceText: async ({ id, searchText, replaceText }) => {
      const layer = state.canvas.find((candidate) => candidate.id === id);
      const text = layer === undefined ? undefined : canvasText(state, layer);

      if (layer === undefined || text === undefined || !text.includes(searchText)) {
        return false;
      }

      layer.text = text.replaceAll(searchText, replaceText);
      replaceInRuns(state.serializedNodes[id], searchText, replaceText);

      return true;
    },
    queryImages: async () => state.stockImages,
    listIconSets: async () =>
      Object.fromEntries(
        (["project", "external", "additional"] as const).map((group) => [
          group,
          state.iconSets
            .filter((set) => set.group === group)
            .map(({ id, displayName }) => ({
              id,
              displayName,
            })),
        ]),
      ),
    readIcons: async ({ iconSetId }) => state.iconSets.find((set) => set.id === iconSetId)?.icons ?? [],
    readIconSetControls: async ({ iconSetIds }) =>
      Object.fromEntries(iconSetIds.map((id) => [id, state.iconSets.find((set) => set.id === id)?.controls ?? null])),
    listComponents: async () => ({
      project: {
        canvas: state.components.map(({ id, name }) => ({
          id,
          displayName: name,
        })),
        code: {},
      },
      additional: state.builtinComponents,
    }),
    getContext: async () => state.agentContext,
    readShaderControls: async ({ shaderNames }) =>
      Object.fromEntries(
        shaderNames.flatMap((name) => (name in state.shaderControls ? [[name, state.shaderControls[name]]] : [])),
      ),
    readComponentControls: async ({ componentIds }) =>
      Object.fromEntries(componentIds.map((id) => [id, state.componentControls[id] ?? { error: `Unknown ${id}` }])),
    readProject: async (queries) => ({
      results: queries.map((query) =>
        query.type === "screenshot" ? screenshotResult(query, session) : { error: "The fake has no such query." },
      ),
    }),
    // Records every call; answers each with the preview, and publishes nothing.
    publish: async (input = {}) => {
      state.agentPublishes.push({ ...input });

      return JSON.parse(JSON.stringify(state.publishPreview)) as unknown;
    },
    makeExternalComponentLocal: async (input) => {
      state.componentAgentCalls.push({
        method: "makeExternalComponentLocal",
        input: { ...input },
      });

      return state.componentAgentAnswers.shift() ?? madeLocal(input.replaceAll, nextId);
    },
    flattenComponentInstance: async (input) => {
      state.componentAgentCalls.push({
        method: "flattenComponentInstance",
        input: { ...input },
      });

      return state.componentAgentAnswers.shift() ?? flattened(input.id, state, nextId);
    },
  };
}

/** Like Framer's "screenshot" query of a URL: an image URL on its CDN, or an error for a page it cannot load. */
function screenshotResult(query: Record<string, unknown>, { state, nextId }: FakeAgentSession): unknown {
  const url = String(query.url);

  if (state.unreachableUrls.includes(url) || !/^https?:\/\//.test(url)) {
    return {
      type: "screenshot",
      url,
      error: "Failed to capture screenshot",
    };
  }

  return {
    type: "screenshot",
    url,
    image_url: `https://framerusercontent.com/screenshots/on-demand/${nextId("shot")}.jpg`,
    ...(query.viewport === undefined ? {} : { viewport: query.viewport }),
    theme: query.theme ?? "light",
  };
}

/** Like Framer: without replaceAll it asks first, whatever the instances (06.10.2026). */
function madeLocal(replaceAll: boolean | undefined, nextId: (prefix: string) => string): unknown {
  if (replaceAll === undefined) {
    return {
      status: "needs_confirmation",
      message:
        "This component may have multiple instances. Use `ask_clarification` to ask the user whether to replace only this instance or all instances, then retry with `replaceAll` set to true or false.",
    };
  }

  return {
    status: "success",
    message: "Made external component local.",
    component: {
      id: nextId("component"),
      displayName: "Component",
    },
  };
}

/**
 * Like Framer: the instance's layer gives way to a frame in its parent, placed as the component's own root is, not as
 * the instance was (06.10.2026).
 */
function flattened(id: string, state: FakeFramerState, nextId: (prefix: string) => string): unknown {
  const instance = state.canvas.find((layer) => layer.id === id);
  const replacement = {
    id: nextId("frame"),
    parentId: instance?.parentId ?? "",
    className: "FrameNode",
    name: instance?.name ?? null,
    attributes: {
      position: "absolute",
      left: "0px",
      top: "0px",
      width: "1140px",
    },
  };

  state.canvas = [...state.canvas.filter((layer) => layer.id !== id), replacement];

  return {
    status: "success",
    replacementId: replacement.id,
  };
}

/** replaceText on a serialized rich text: each run's text, so its formatting stays. */
function replaceInRuns(node: unknown, searchText: string, replaceText: string): void {
  if (typeof node !== "object" || node === null) {
    return;
  }

  const { type, attributes, children } = node as {
    type?: unknown;
    attributes?: { text?: unknown };
    children?: unknown;
  };

  if (type === "TextRun" && typeof attributes?.text === "string") {
    attributes.text = attributes.text.replaceAll(searchText, replaceText);
  }

  for (const child of Array.isArray(children) ? children : []) {
    replaceInRuns(child, searchText, replaceText);
  }
}

/** A copy, as Framer answers in JSON: a later SET must not change what an earlier read returned. */
function jsonCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Runs each command on its own and reports failures in `errors`, keyed by message, like Framer. */
function applyDsl(dsl: string, session: FakeAgentSession): unknown {
  const errors: Record<string, string[]> = {};
  const renamedIds: Record<string, string> = {};
  const fail = (message: string, target: string) => {
    errors[message] = [...(errors[message] ?? []), target];
  };

  for (const command of parseDsl(dsl)) {
    try {
      if (command.verb === "ADD" && DSL_VARIABLE_TYPE.test(command.type ?? "")) {
        // Framer creates variables but leaves them out of renamedIds.
        addVariable(command, session);
      } else if (command.verb === "ADD") {
        renamedIds[command.id] = addNode(command, session);
      } else if (command.verb === "SET") {
        setNode(command, session);
      } else if (command.verb === "DEL") {
        deleteNode(command, session);
      } else {
        fail(`The fake does not model this command (only +Node, SET and DEL): ${command.verb}.`, command.raw);
      }
    } catch (error) {
      if (!(error instanceof FakeCommandError)) {
        throw error;
      }

      fail(error.message, command.id);
    }
  }

  const count = Object.values(errors).flat().length;

  if (count === 0) {
    return {
      message: "Commands applied cleanly.",
      renamedIds,
    };
  }

  return {
    message: `Commands: ${count} errors.`,
    errors,
    renamedIds,
  };
}

function addNode({ type, id, attributes }: DslCommand, session: FakeAgentSession): string {
  if (session.tempIds.has(id)) {
    throw new FakeCommandError(`Cannot complete \`+${type}\`: The requested id already exists. Choose a new id.`);
  }

  const { name = id, ...rest } = attributes;
  const created = createNode(type, name, rest, session);

  session.tempIds.set(id, created);

  return created;
}

function createNode(
  type: string | null,
  name: string,
  attributes: Record<string, string>,
  session: FakeAgentSession,
): string {
  const { state, nextId } = session;

  if (type === "ColorStyleTokenNode") {
    const { light = "rgb(0, 0, 0)", dark = null } = tokenColors(attributes);
    const token: FakeColorStyle = {
      id: nextId("color"),
      ...stylePath(name),
      light,
      dark,
    };

    state.colorStyles.push(token);

    return token.id;
  }

  if (type === "TextStylePresetNode") {
    const created = withTextStyleAttributes(
      newTextStyle("", name),
      attributes,
      tokenLookup(session),
      breakpointWidths(state),
    );
    const style = {
      ...created,
      id: nextId("text"),
    };

    state.textStyles.push(withAvailableWeight(style, state));

    return style.id;
  }

  if (type === LINK_STYLE_NODE_TYPE) {
    const style = newLinkStyle(nextId("link"), name, attributes);

    state.linkStyles.push(style);

    return style.id;
  }

  throw new FakeCommandError(`The fake does not model +${type} nodes.`);
}

/** A variable in its scope's serialized `variables`, as serialize() lists them. */
function addVariable({ type, id, attributes }: DslCommand, session: FakeAgentSession): void {
  const { scope, name = id, initialValue, ...rest } = attributes;
  const node = session.state.serializedNodes[targetOf(scope ?? "", session)] as { variables?: unknown[] } | undefined;

  if (node === undefined) {
    throw new FakeCommandError(`Cannot complete \`+${type}\`: scope ${scope} does not exist.`);
  }

  if (type === "IconVariable" && initialValue !== undefined) {
    throw new FakeCommandError(
      `Cannot apply \`initialValue="${initialValue}"\`: Assertion Error: Icon "${initialValue}" could not be prepared as a variable from set "${rest.set}".`,
    );
  }

  const variable = {
    id: session.nextId("var"),
    name,
    node: type,
    ...rest,
    ...(initialValue === undefined ? {} : { initialValue }),
  };

  node.variables = [...(node.variables ?? []), variable];
  session.tempIds.set(id, variable.id);
}

function findVariable(id: string, state: FakeFramerState): Record<string, unknown> | undefined {
  for (const [scopeId, node] of Object.entries(state.serializedNodes)) {
    if (state.unloadedScopes.includes(scopeId)) {
      continue;
    }

    const variables = (node as { variables?: Record<string, unknown>[] }).variables ?? [];
    const variable = variables.find((candidate) => candidate.id === id);

    if (variable !== undefined) {
      return variable;
    }
  }

  return undefined;
}

function setNode({ id, attributes }: DslCommand, session: FakeAgentSession): void {
  const target = targetOf(id, session);
  const variable = findVariable(target, session.state);

  if (variable !== undefined) {
    Object.assign(variable, attributes);

    return;
  }

  const token = session.state.colorStyles.find((candidate) => candidate.id === target);

  if (token !== undefined) {
    Object.assign(token, tokenColors(attributes));

    return;
  }

  const layer = session.state.canvas.find((candidate) => candidate.id === target);

  if (layer !== undefined) {
    layer.attributes = {
      ...layer.attributes,
      ...attributes,
    };

    return;
  }

  const link = session.state.linkStyles.findIndex((candidate) => candidate.id === target);

  if (link !== -1) {
    const { name, ...rest } = attributes;
    const current = session.state.linkStyles[link];

    if (current !== undefined) {
      session.state.linkStyles[link] = withLinkAttributes(
        {
          ...current,
          name: name ?? current.name,
        },
        rest,
      );
    }

    return;
  }

  const style = session.state.textStyles.find((candidate) => candidate.id === target);
  const node = session.state.serializedNodes[target];

  if (style === undefined && typeof node === "object" && node !== null) {
    setSerializedAttributes(node, attributes);

    return;
  }

  if (style === undefined) {
    throw new FakeCommandError(missingTarget("SET"));
  }

  Object.assign(
    style,
    withAvailableWeight(
      withTextStyleAttributes(style, attributes, tokenLookup(session), breakpointWidths(session.state)),
      session.state,
    ),
  );
}

/** Like Framer: a weight an uploaded family lacks becomes the nearest one it has, without an error. */
function withAvailableWeight<T extends Pick<FakeTextStyle, "font">>(style: T, state: FakeFramerState): T {
  const { family, weight, style: fontStyle } = style.font;
  const weights = state.projectFonts
    .filter((font) => font.family === family && font.style === fontStyle)
    .flatMap((font) => (font.weight === null ? [] : [font.weight]));

  if (weight === null || weights.length === 0 || weights.includes(weight)) {
    return style;
  }

  const nearest = weights.reduce((best, candidate) =>
    Math.abs(candidate - weight) < Math.abs(best - weight) ? candidate : best,
  );

  return {
    ...style,
    font: {
      ...style.font,
      weight: nearest,
    },
  };
}

function deleteNode({ id }: DslCommand, session: FakeAgentSession): void {
  const { state } = session;
  const target = targetOf(id, session);
  const count = state.colorStyles.length + state.textStyles.length + state.linkStyles.length;
  const link = state.linkStyles.find((style) => style.id === target);

  if (link !== undefined) {
    assertLinkStyleUnused(state, link);
  }

  state.colorStyles = state.colorStyles.filter((token) => token.id !== target);
  state.textStyles = state.textStyles.filter((style) => style.id !== target);
  state.linkStyles = state.linkStyles.filter((style) => style.id !== target);

  if (state.colorStyles.length + state.textStyles.length + state.linkStyles.length === count) {
    throw new FakeCommandError(missingTarget("DEL"));
  }
}

/** Earlier commands' temp ids stand for the nodes they created, in this call and later ones. */
function targetOf(id: string, { tempIds }: FakeAgentSession): string {
  return tempIds.get(id) ?? id;
}

function tokenLookup(session: FakeAgentSession): (id: string) => FakeColorStyle | undefined {
  return (id) => session.state.colorStyles.find((token) => token.id === targetOf(id, session));
}

function missingTarget(verb: string): string {
  return `Cannot complete \`${verb}\`: The target does not exist. Re-read the project and retry with a current target id.`;
}

function dslNode(style: { readonly id: string; readonly path: string }) {
  return {
    id: style.id,
    attributes: {
      name: style.path.replace(/^\/+/, ""),
    },
  };
}

/** The home page's breakpoint widths, widest first. */
function breakpointWidths(state: FakeFramerState): number[] {
  return state.breakpoints.map((breakpoint) => breakpoint.width).sort((a, b) => b - a);
}
