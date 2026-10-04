import { projectEditorUrl, type RevealResult } from "@sitewright/core";
import { knownProject } from "../transports/current-project.ts";
import type { EditorLinksOptions } from "../types/ui-api.ts";

/**
 * Shows nodes in the Framer editor: through the plugin when it is open in this session's project (it gets an
 * `editor.reveal` event), and as a link to open otherwise. The link comes from the project's main branch, per project.
 */
export class EditorLinks {
  readonly #options: EditorLinksOptions;
  readonly #urls = new Map<string, Promise<string | null>>();

  constructor(options: EditorLinksOptions) {
    this.#options = options;
  }

  async reveal(id: string): Promise<RevealResult> {
    const { plugin, transports } = this.#options;
    const project = knownProject(transports);
    const pluginProject = transports.status().transports.find((transport) => transport.transport === "plugin")?.project;
    // A plugin open in another project would not find the node: then the link opens the right one.
    const relayed =
      plugin.isConnected() &&
      (project === null || pluginProject === undefined || pluginProject === null || pluginProject.id === project.id);

    if (relayed) {
      plugin.notify("editor.reveal", { id });
    }

    const base = await this.#editorUrl();

    return {
      relayed,
      url: base === null ? null : withNode(base, id),
    };
  }

  #editorUrl(): Promise<string | null> {
    const { transports } = this.#options;
    const key = knownProject(transports)?.id ?? "";
    let url = this.#urls.get(key);

    if (url === undefined) {
      const loading = transports
        .run(projectEditorUrl, {})
        .then((result) => result.url)
        .catch(() => null);

      this.#urls.set(key, loading);
      // No link yet (not connected, no branching): ask again next time.
      void loading.then((value) => {
        if (value === null) {
          this.#urls.delete(key);
        }
      });
      url = loading;
    }

    return url;
  }
}

/** Framer opens a node when its id is in `?node=`. */
function withNode(editorUrl: string, id: string): string {
  const url = new URL(editorUrl);

  url.searchParams.set("node", id);

  return url.toString();
}
