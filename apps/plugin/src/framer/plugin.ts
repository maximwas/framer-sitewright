// Everything that touches the plugin's `framer` object; the rest of the plugin stays free of the Plugin API.
import { framer, type ProtectedMethod } from "@framer/plugin";
import type { FramerPort, FramerRuntime, PluginInfo, PluginPermission } from "@sitewright/core";
import { version as pluginVersion } from "../../package.json";
import { NEW_TEXT_PLACEHOLDER, PLUGIN_WINDOW, REVEAL_MAX_ZOOM } from "../constants/ui.ts";

// Compile-time conformance: if @framer/plugin drifts from the structural port, this line stops compiling.
const framerPort: FramerPort = framer;

/**
 * The plugin's `framer`, plus text creation: @framer/plugin 5.1 declares createTextNode but ships it only on a class
 * it never instantiates, so `framer` has none. Methods stay bound to `framer`: its private fields do not pass a proxy.
 */
const port: FramerPort = new Proxy(framerPort, {
  get(target, key) {
    if (key === "createTextNode") {
      return target.createTextNode?.bind(target) ?? createTextNode;
    }

    const value: unknown = Reflect.get(target, key);

    return typeof value === "function" ? value.bind(target) : value;
  },
});

/**
 * A text node through the public API: addText puts one on the canvas without naming it, so the text nodes before and
 * after tell which it is; then it moves under its parent and takes its attributes.
 */
async function createTextNode(attributes: Record<string, unknown>, parentId?: string): Promise<unknown> {
  const before = new Set((await framer.getNodesWithType("TextNode")).map((node) => node.id));

  await framer.addText(NEW_TEXT_PLACEHOLDER);

  const added = (await framer.getNodesWithType("TextNode")).filter((node) => !before.has(node.id));
  const node = added[0];

  if (node === undefined || added.length > 1) {
    throw new Error(`Framer added ${added.length} text nodes for one: undo this call and apply the batch again.`);
  }

  if (parentId !== undefined) {
    await framer.setParent(node.id, parentId);
  }

  return (await framerPort.setAttributes(node.id, attributes)) ?? node;
}

/** Operations run on the plugin's own `framer`, which has no framer.agent (DSL) and no screenshots. */
export const pluginRuntime: FramerRuntime = {
  transport: "plugin",
  port,
  agent: null,
  screenshot: null,
};

/** Opens the plugin's window: small, top right, out of the way of the canvas. */
export function showPluginWindow(): void {
  void framer.showUI(PLUGIN_WINDOW);
}

/**
 * Who the plugin is, for the hello: its project, and the project's editor link when Framer gives it. A project Framer
 * does not name is null: failing the hello would only loop.
 */
export async function readPluginInfo(): Promise<PluginInfo> {
  let project: PluginInfo["project"] = null;

  try {
    const { id, name } = await framer.getProjectInfo();

    project = {
      id,
      name,
    };
  } catch {
    // Unknown project: the server still takes the plugin.
  }

  return {
    pluginVersion,
    framerMode: framer.mode,
    project,
    userAgent: navigator.userAgent,
    editorUrl: await readEditorUrl(),
  };
}

/**
 * The project's editor link, which a Server API key connects by (the project id the plugin knows is hashed). Framer
 * gives it through the main branch, so only projects with branching (Pro plans and up) have it.
 */
async function readEditorUrl(): Promise<string | null> {
  try {
    return (await framer.getBranch("main"))?.url ?? null;
  } catch {
    return null;
  }
}

/** Whether the current user may call every one of these protected methods. */
export function isAllowedTo(permissions: readonly PluginPermission[]): boolean {
  // Compile-time check: every permission core declares is a method framer.isAllowedTo knows.
  const [first, ...rest]: readonly ProtectedMethod[] = permissions;

  return first === undefined || framer.isAllowedTo(first, ...rest);
}

/**
 * The journal page asks the editor to show a node (`editor.reveal`): select it and bring it into view, zooming no
 * closer than 100% (a tiny node would otherwise fill the screen at 3200%).
 */
export function revealOnRequest(name: string, data: unknown): void {
  if (name !== "editor.reveal" || typeof data !== "object" || data === null || !("id" in data)) {
    return;
  }

  const { id } = data;

  if (typeof id === "string") {
    framer
      .navigateTo(id, {
        select: true,
        zoomIntoView: { maxZoom: REVEAL_MAX_ZOOM },
      })
      .catch(() => framer.notify(`Could not open ${id} in the editor.`, { variant: "warning" }));
  }
}

/** Copies a command; Framer lets plugins write the clipboard. Says so when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);

    return true;
  } catch {
    framer.notify("Could not copy: select the command and copy it by hand.", { variant: "warning" });

    return false;
  }
}
