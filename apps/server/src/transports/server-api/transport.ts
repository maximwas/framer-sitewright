import { AsyncLocalStorage } from "node:async_hooks";
import { type FramerRuntime, type Operation, OperationError, runOperation } from "@sitewright/core";
import { ErrorCode, type Framer, FramerAPIError } from "framer-api";
import type * as z from "zod";
import { SERVER_API_SETUP_HINT, STALE_NODE_MESSAGE } from "../../constants/transports.ts";
import type {
  CallTrace,
  FramerTransport,
  OperationRunOptions,
  ProjectRef,
  RunOptions,
  TransportStatus,
} from "../../types/transports.ts";
import { traceAgent } from "../../utils/trace-agent.ts";
import { createServerApiRuntime } from "./runtime.ts";
import type { ServerApiSession } from "./session.ts";

/** Runs operations here, in Node, on the framer-api connection to one project (its saved key). */
export class ServerApiTransport implements FramerTransport {
  readonly kind = "server-api";
  readonly #session: ServerApiSession;
  readonly #createRuntime: (framer: Framer) => FramerRuntime;
  #current: { readonly framer: Framer; readonly runtime: FramerRuntime } | null = null;
  #project: ProjectRef | null = null;
  /** The trace of the call running now; framer.agent marks it (see traceAgent). Async-local: reads run in parallel. */
  readonly #traces = new AsyncLocalStorage<CallTrace>();

  constructor(session: ServerApiSession, createRuntime: (framer: Framer) => FramerRuntime = createServerApiRuntime) {
    this.#session = session;
    this.#createRuntime = createRuntime;
  }

  status(): TransportStatus {
    return {
      transport: "server-api",
      configured: true,
      connected: this.#session.connected,
      project: this.#project,
      hint: null,
    };
  }

  run<I extends z.ZodObject, O extends z.ZodObject>(
    operation: Operation<I, O>,
    input: unknown,
    { history, trace }: OperationRunOptions = {},
  ): Promise<z.output<O>> {
    // Repeating a non-idempotent operation (design.apply) after a lost session could apply it twice.
    const replay = operation.idempotent;
    const run = () =>
      this.withRuntime(
        (runtime) =>
          runOperation(
            operation,
            history === undefined
              ? { runtime }
              : {
                  runtime,
                  history,
                },
            input,
          ),
        { replay },
      );

    const attempt = () => (trace === undefined ? run() : this.#traces.run(trace, run));

    // A connection keeps the project as it was when it opened: a node the user added in the editor since is "not
    // found" (seen 12.10.2026). Reconnect then; a read runs once more, anything else is left to the caller.
    return attempt().catch(async (error: unknown) => {
      if (!isNodeNotFound(error)) {
        throw error;
      }

      await this.reconnect();

      if (!replay) {
        throw error;
      }

      return attempt();
    });
  }

  /** Runs `fn` on this connection's runtime. Server-API-only features (DSL reference, screenshots) use it directly. */
  withRuntime<T>(fn: (runtime: FramerRuntime) => Promise<T>, options: RunOptions = { replay: true }): Promise<T> {
    return this.#session.run(async (framer) => fn(await this.#runtimeFor(framer)), options);
  }

  /** A fresh connection, so the next call sees the project as it is now. */
  reconnect(): Promise<void> {
    this.#current = null;
    this.#project = null;

    return this.#session.reconnect();
  }

  close(): Promise<void> {
    this.#current = null;

    return this.#session.close();
  }

  /** One runtime per connection, so its caches (font catalog, DSL temp ids) live as long as the connection. */
  async #runtimeFor(framer: Framer): Promise<FramerRuntime> {
    if (this.#current?.framer !== framer) {
      this.#current = {
        framer,
        runtime: this.#withTracedAgent(this.#createRuntime(framer)),
      };
    }

    const { runtime } = this.#current;

    this.#project ??= await readProject(runtime);

    return runtime;
  }

  #withTracedAgent(runtime: FramerRuntime): FramerRuntime {
    return runtime.agent === null
      ? runtime
      : {
          ...runtime,
          agent: traceAgent(runtime.agent, () => this.#traces.getStore()),
        };
  }
}

/** The project's id and name for framer_status. Best effort: failing to read them must not fail the call. */
async function readProject(runtime: FramerRuntime): Promise<ProjectRef | null> {
  try {
    const { id, name } = await runtime.port.getProjectInfo();

    return {
      id,
      name,
    };
  } catch {
    return null;
  }
}

/** Stands in for the Server API when the project has no saved key. */
export const unconfiguredServerApi: FramerTransport = {
  kind: "server-api",
  status: () => ({
    transport: "server-api",
    configured: false,
    connected: false,
    project: null,
    hint: SERVER_API_SETUP_HINT,
  }),
  run: () =>
    Promise.reject(new OperationError("NOT_CONFIGURED", "The Server API is not configured.", SERVER_API_SETUP_HINT)),
  close: () => Promise.resolve(),
};

/** Framer found no node by an id: on a connection older than the user's edits, the node may exist now. */
function isNodeNotFound(error: unknown): boolean {
  if (error instanceof FramerAPIError) {
    return error.code === ErrorCode.NODE_NOT_FOUND;
  }

  return error instanceof OperationError && error.code === "NOT_FOUND" && STALE_NODE_MESSAGE.test(error.message);
}
