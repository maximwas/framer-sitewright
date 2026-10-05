import { OperationError } from "@sitewright/core";
import { SERVER_API_SETUP_HINT } from "../../constants/transports.ts";
import type { KeyStore } from "../../keys/key-store.ts";
import type { StoredProject } from "../../types/keys.ts";
import type { ProjectRef, SavedProject, ServerApiPoolOptions } from "../../types/transports.ts";
import { projectUrlOf } from "../../utils/project-key.ts";
import type { ServerApiTransport } from "./transport.ts";

/**
 * Which Server API a call uses: the saved project framer_connect chose, else the key saved for the project the plugin
 * is open in. Without the plugin (only in server-api mode: auto needs the plugin): the saved project this session
 * worked on, so the session never slides into another project, else the project used last. Keys come only from
 * keys.json (`sitewright key`); a fixed pool (tests) has one Server API for everything. A project's connection opens on first use and stays for the session; a new key for it replaces
 * it. Without any key there is no Server API and the plugin does the work.
 */
export class ServerApiPool {
  readonly #fixed: ServerApiTransport | null;
  readonly #keys: KeyStore | null;
  readonly #create: (project: StoredProject) => ServerApiTransport;
  readonly #byProject = new Map<string, { readonly key: string; readonly transport: ServerApiTransport }>();
  #pluginProject: () => ProjectRef | null = () => null;
  /** framer_connect's choice, and the plugin's project when it was made (or since seen on the chosen project). */
  #chosen: { readonly id: string; pluginAt: string | null } | null = null;
  /** The saved project this session last worked on, chosen or through the plugin: kept while the plugin is away. */
  #session: string | null = null;

  /** One Server API for every call (or none): tests and the integration sandbox. */
  static fixed(transport: ServerApiTransport | null): ServerApiPool {
    return new ServerApiPool({
      fixed: transport,
      keys: null,
      create: () => {
        throw new Error("A fixed Server API has no saved keys.");
      },
    });
  }

  constructor(options: ServerApiPoolOptions) {
    this.#fixed = options.fixed;
    this.#keys = options.keys;
    this.#create = options.create;
  }

  /** Where the pool learns the plugin's project, once the plugin transport exists. */
  followPlugin(project: () => ProjectRef | null): void {
    this.#pluginProject = project;
  }

  /**
   * Pins the Server API to a saved project, by id, name (any case) or editor link; null follows the plugin again. The
   * choice lasts until the plugin opens another project: whichever came last is what the person works on.
   */
  choose(query: string | null): StoredProject | null {
    if (query === null) {
      this.#chosen = null;

      return null;
    }

    const project = this.#find(query);

    this.#chosen = {
      id: project.id,
      pluginAt: this.#pluginProject()?.id ?? null,
    };

    return project;
  }

  /** The projects with a saved key, without their keys, and which one framer_connect chose. */
  projects(): SavedProject[] {
    const chosen = this.#chosenProject(this.#pluginProject())?.id ?? null;

    return (this.#keys?.list() ?? []).map(({ id, name }) => ({
      id,
      name,
      chosen: id === chosen,
    }));
  }

  current(): ServerApiTransport | null {
    const project = this.#pluginProject();
    const chosen = this.#chosenProject(project);

    if (chosen !== null) {
      return this.#for(chosen);
    }

    if (project !== null) {
      const saved = this.#keys?.get(project.id) ?? null;

      // A fixed Server API may be on another project than the plugin: the router's same-project checks catch that.
      return saved === null ? this.#fixed : this.#for(saved);
    }

    const session = this.#session === null ? null : (this.#keys?.get(this.#session) ?? null);

    if (session !== null) {
      return this.#for(session);
    }

    if (this.#fixed !== null) {
      return this.#fixed;
    }

    const last = this.#keys?.lastUsed() ?? null;

    return last === null ? null : this.#for(last);
  }

  /** Whether any Server API key is set up, for the hints. */
  configured(): boolean {
    return this.#fixed !== null || (this.#keys?.list().length ?? 0) > 0;
  }

  async close(): Promise<void> {
    await Promise.allSettled([
      this.#fixed?.close(),
      ...[...this.#byProject.values()].map(({ transport }) => transport.close()),
    ]);
  }

  /** The chosen project while the choice holds: dropped once the plugin opens another project or its key is gone. */
  #chosenProject(plugin: ProjectRef | null): StoredProject | null {
    const chosen = this.#chosen;

    if (chosen === null) {
      return null;
    }

    if (plugin !== null && plugin.id !== chosen.pluginAt) {
      if (plugin.id !== chosen.id) {
        this.#chosen = null;

        return null;
      }

      chosen.pluginAt = plugin.id;
    }

    const saved = this.#keys?.get(chosen.id) ?? null;

    if (saved === null) {
      this.#chosen = null;
    }

    return saved;
  }

  /** A saved project by id, name or editor link; else by part of its name, as the user may say it. */
  #find(query: string): StoredProject {
    const projects = this.#keys?.list() ?? [];
    const wanted = query.trim();
    const lower = wanted.toLowerCase();
    const url = projectUrlOf(wanted);
    const exact = projects.filter(
      (project) => project.id === wanted || project.name.toLowerCase() === lower || project.url === url,
    );
    const matches = exact.length > 0 ? exact : projects.filter((project) => project.name.toLowerCase().includes(lower));
    const [match, ...others] = matches;

    if (match !== undefined && others.length === 0) {
      return match;
    }

    if (match !== undefined) {
      throw new OperationError(
        "INVALID_INPUT",
        `"${wanted}" fits ${matches.length} saved projects: ${matches.map(({ name }) => name).join(", ")}.`,
        "Ask the user which one, or pass its id from framer_status.",
      );
    }

    throw new OperationError(
      "NOT_FOUND",
      projects.length === 0
        ? "No project has a saved Server API key yet."
        : `No saved Server API key for "${wanted}". Projects with a key: ${projects.map(({ name }) => name).join(", ")}.`,
      SERVER_API_SETUP_HINT,
    );
  }

  #for(project: StoredProject): ServerApiTransport {
    const open = this.#byProject.get(project.id);

    this.#session = project.id;

    if (open !== undefined && open.key === project.key) {
      return open.transport;
    }

    void open?.transport.close();

    const transport = this.#create(project);

    this.#byProject.set(project.id, {
      key: project.key,
      transport,
    });
    // Only orders "used last": a failed write must not take the server down as an unhandled rejection.
    void this.#keys?.touch(project.id).catch(() => undefined);

    return transport;
  }
}
