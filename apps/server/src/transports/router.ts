import {
  type AnyOperation,
  type FramerRuntime,
  needsAgent,
  type Operation,
  OperationError,
  type TransportKind,
} from "@sitewright/core";
import type * as z from "zod";
import {
  CODE_COMPILE_MS,
  LEARN_PROJECT_COOLDOWN_MS,
  SERVER_API_SETUP_HINT,
  SERVER_API_STALE_AFTER,
} from "../constants/transports.ts";
import type {
  FramerTransport,
  OperationRunOptions,
  PluginUiChannel,
  ProjectRef,
  RouterStatus,
  ServerApiOptions,
  TransportMode,
} from "../types/transports.ts";
import type { ServerApiPool } from "./server-api/pool.ts";
import { type ServerApiTransport, unconfiguredServerApi } from "./server-api/transport.ts";

/**
 * Sends each call to the transport the mode selects; the Server API also serves the DSL reference and screenshots.
 * auto puts the plugin first: while it is connected, every call it can run goes there, and only
 * what needs framer.agent (the DSL) goes to the Server API, which must then be on the plugin's project.
 */
export class TransportRouter {
  /** The Server API of the project in work: changes with the plugin's project (see ServerApiPool). */
  readonly #serverApis: ServerApiPool;
  readonly #plugin: FramerTransport & PluginUiChannel;
  #mode: TransportMode;
  /** The plugin's "Plugin first" switch, as last read; auto reads it again on every call. */
  #pluginFirst = true;
  #readPluginFirst: (() => Promise<boolean>) | null = null;
  /** When code was last written: the Server API reopens its session once Framer has compiled it (CODE_COMPILE_MS). */
  #codeChangedAt: number | null = null;
  /** When learning the Server API's project last failed (see LEARN_PROJECT_COOLDOWN_MS). */
  #learnFailedAt = Number.NEGATIVE_INFINITY;

  constructor(serverApis: ServerApiPool, plugin: FramerTransport & PluginUiChannel, mode: TransportMode) {
    this.#serverApis = serverApis;
    this.#plugin = plugin;
    this.#mode = mode;
  }

  get #serverApi(): ServerApiTransport | null {
    return this.#serverApis.current();
  }

  /** Calls from the plugin window and events to it; works whichever transport runs the operations. */
  get pluginUi(): PluginUiChannel {
    return this.#plugin;
  }

  setMode(mode: TransportMode): void {
    this.#mode = mode;
  }

  /**
   * Sets the Server API to a project with a saved key (framer_connect { project }), or back to the plugin's project
   * with null, and connects to check the key: a key that no longer opens its project drops the choice again.
   */
  async useProject(project: string | null): Promise<void> {
    if (this.#serverApis.choose(project) === null) {
      return;
    }

    try {
      await this.#serverApi?.withRuntime(async () => undefined);
    } catch (error) {
      this.#serverApis.choose(null);

      throw error;
    }
  }

  /** Where auto learns whether the plugin goes first (the settings file); without it, it always does. */
  readPluginFirstFrom(read: () => Promise<boolean>): void {
    this.#readPluginFirst = read;
  }

  status(): RouterStatus {
    const serverApi = (this.#serverApi ?? unconfiguredServerApi).status();
    const plugin = this.#plugin.status();
    const selected = this.#selectedKind() === "plugin" ? plugin : serverApi;
    const active = selected.configured ? selected.transport : null;

    return {
      mode: this.#mode,
      active,
      transports: [serverApi, plugin],
      hint: active === null ? selected.hint : this.#otherProjectHint(),
      projects: this.#serverApis.projects(),
    };
  }

  /** Reopens the Server API connection and connects again, so it sees what changed in the editor since. */
  async reconnectServerApi(): Promise<void> {
    if (this.#serverApi === null) {
      return;
    }

    await this.#serverApi.reconnect();
    await this.#serverApi.withRuntime(async () => undefined);
  }

  async run<I extends z.ZodObject, O extends z.ZodObject>(
    operation: Operation<I, O>,
    input: unknown,
    options?: OperationRunOptions,
  ): Promise<z.output<O>> {
    const output = await this.#dispatch(operation, input, options);

    // The Server API session keeps the project as it connected: its component list would miss the new code.
    if (SERVER_API_STALE_AFTER.has(operation.name)) {
      this.#codeChangedAt = Date.now();
    }

    return output;
  }

  /** After a code change, before the Server API's next call: wait out Framer's compile, then open a new session. */
  async #freshAfterCode(): Promise<void> {
    const changedAt = this.#codeChangedAt;

    if (changedAt === null) {
      return;
    }

    this.#codeChangedAt = null;

    const wait = changedAt + CODE_COMPILE_MS - Date.now();

    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }

    await this.#serverApi?.reconnect();
  }

  async #dispatch<I extends z.ZodObject, O extends z.ZodObject>(
    operation: Operation<I, O>,
    input: unknown,
    options?: OperationRunOptions,
  ): Promise<z.output<O>> {
    this.#assertPluginPresent();

    if (this.#mode === "auto" && this.#readPluginFirst !== null) {
      this.#pluginFirst = await this.#readPluginFirst();
    }

    await this.#learnServerApiProject();

    // Only the editor knows its selection: the plugin answers in every mode. Unless the session works through the plugin
    // alone, its project must be the Server API's, so the ids that come back belong to the project the session edits.
    if (operation.needsPlugin) {
      if (this.#mode !== "plugin") {
        await this.#learnServerApiProject(true);
        this.#assertSameProject(
          this.#serverApi?.status().project ?? null,
          "Open the plugin in the Server API project.",
        );
      }

      return this.#plugin.run(operation, input, options);
    }

    if (!this.#splits(operation, input)) {
      if (this.#selectedKind() === "server-api") {
        await this.#freshAfterCode();
      }

      return this.#selected().run(operation, input, options);
    }

    await this.#freshAfterCode();

    const serverApi = this.#serverApi ?? unconfiguredServerApi;

    this.#assertSameProject(serverApi.status().project);

    return serverApi.run(operation, input, options);
  }

  /**
   * auto works only through a connected plugin: the project is always the one the plugin is open in, so no call slides
   * into another project while the plugin reloads. The Server API alone is a mode chosen on purpose (server-api), and
   * with the bridge off or broken there is no plugin to wait for.
   */
  #assertPluginPresent(): void {
    if (this.#mode === "auto" && this.#plugin.status().configured && !this.#plugin.isConnected()) {
      throw new OperationError(
        "UNSUPPORTED_TRANSPORT",
        "The Sitewright plugin is not connected: nothing runs without it, so no change can go to another project.",
        "Ask the user to open the Sitewright plugin in the Framer project and click Connect, then retry.",
      );
    }
  }

  /** Which transport run() sends this call to, for the journal to record. */
  routeOf(operation: AnyOperation, input: unknown): TransportKind {
    if (operation.needsPlugin) {
      return "plugin";
    }

    return this.#splits(operation, input) ? "server-api" : this.#selectedKind();
  }

  /** Runs a Server-API-only feature (DSL reference, screenshots) there, whichever transport is active. */
  withServerApi<T>(fn: (runtime: FramerRuntime) => Promise<T>, options: ServerApiOptions = {}): Promise<T> {
    try {
      this.#assertPluginPresent();
    } catch (error) {
      return Promise.reject(error);
    }

    const serverApi = this.#serverApi;

    if (serverApi === null) {
      return Promise.reject(
        new OperationError(
          "UNSUPPORTED_TRANSPORT",
          "This needs the Server API: the plugin has no framer.agent and no screenshots.",
          SERVER_API_SETUP_HINT,
        ),
      );
    }

    return serverApi.withRuntime(async (runtime) => {
      if (options.sameProjectAsActive) {
        this.#assertPluginOnProject(serverApi.status().project);
      }

      return fn(runtime);
    });
  }

  async close(): Promise<void> {
    await Promise.allSettled([this.#serverApis.close(), this.#plugin.close()]);
  }

  /**
   * auto: the plugin while it is connected and goes first (the plugin's switch), else the Server API when it is
   * configured, else the plugin.
   */
  #selectedKind(): TransportKind {
    if (this.#mode !== "auto") {
      return this.#mode;
    }

    return this.#pluginLeads() || this.#serverApi === null ? "plugin" : "server-api";
  }

  /**
   * The plugin leads only in the project the Server API is set to: with two sitewright servers (say the sandbox and a
   * client's site) one plugin window must not take calls meant for the other project. Unknown projects pass.
   */
  #pluginLeads(): boolean {
    return this.#pluginFirst && this.#plugin.isConnected() && !this.#pluginOnOtherProject();
  }

  #pluginOnOtherProject(): boolean {
    const serverApiProject = this.#serverApi?.status().project ?? null;
    const pluginProject = this.#plugin.status().project;

    return serverApiProject !== null && pluginProject !== null && serverApiProject.id !== pluginProject.id;
  }

  #otherProjectHint(): string | null {
    if (this.#mode !== "auto" || !this.#plugin.isConnected() || !this.#pluginOnOtherProject()) {
      return null;
    }

    const serverApi = this.#serverApi?.status().project?.name ?? "";
    const plugin = this.#plugin.status().project?.name ?? "";
    const chosen = this.#serverApis.projects().some((project) => project.chosen);

    return chosen
      ? `The plugin is open in "${plugin}", but framer_connect chose "${serverApi}": calls go through the Server API. Open the plugin in "${serverApi}" to work live, or call framer_connect { project: null } to work on "${plugin}".`
      : `The plugin is open in "${plugin}", but this server is set to "${serverApi}": calls go through the Server API. Open the plugin in "${serverApi}" to work live.`;
  }

  /**
   * In auto, which project the Server API is set to decides whether the plugin may lead: learn it before the first call.
   * `anyMode`: learn it whatever the mode, for a call that must check the plugin's project.
   */
  async #learnServerApiProject(anyMode = false): Promise<void> {
    const serverApi = this.#serverApi;

    if (
      (this.#mode !== "auto" && !anyMode) ||
      serverApi === null ||
      !this.#plugin.isConnected() ||
      serverApi.status().project !== null ||
      Date.now() - this.#learnFailedAt < LEARN_PROJECT_COOLDOWN_MS
    ) {
      return;
    }

    try {
      await serverApi.withRuntime(async () => undefined);
    } catch {
      // The Server API is down: the project stays unknown and the plugin leads as before, until the next try.
      this.#learnFailedAt = Date.now();
    }
  }

  /**
   * The plugin leads in auto, but this call needs framer.agent: it goes to the Server API of the same project. Without
   * a Server API it stays with the plugin, and the operation takes its Plugin API path (design_apply, nodes_read).
   */
  #splits(operation: AnyOperation, input: unknown): boolean {
    return this.#mode === "auto" && this.#serverApi !== null && this.#pluginLeads() && needsAgent(operation, input);
  }

  #selected(): FramerTransport {
    return this.#selectedKind() === "plugin" ? this.#plugin : (this.#serverApi ?? unconfiguredServerApi);
  }

  #assertPluginOnProject(serverApiProject: ProjectRef | null): void {
    if (this.#selectedKind() === "plugin") {
      this.#assertSameProject(serverApiProject);
    }
  }

  /** A call split across both transports must reach one project; an unknown one (not connected yet) passes. */
  #assertSameProject(
    serverApiProject: ProjectRef | null,
    hint = 'Open the plugin in the Server API project, or switch with framer_connect { transport: "server-api" }.',
  ): void {
    const pluginProject = this.#plugin.status().project;

    if (serverApiProject === null || pluginProject === null || serverApiProject.id === pluginProject.id) {
      return;
    }

    throw new OperationError(
      "UNSUPPORTED_TRANSPORT",
      `The Server API opens project "${serverApiProject.name}", but the plugin edits "${pluginProject.name}", so the result would show the wrong project.`,
      hint,
    );
  }
}
