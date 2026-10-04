import {
  type Capabilities,
  type CapabilityProbe,
  errorMessage,
  type PlanLimit,
  projectCapabilities,
} from "@sitewright/core";
import { NOT_CHECKED_YET } from "../constants/capabilities.ts";
import { currentProject, knownProject } from "../transports/current-project.ts";
import type { CapabilityTrackerOptions } from "../types/capabilities.ts";
import type { OperationRunner } from "../types/transports.ts";
import { planLimitMessage } from "./plan-limits.ts";
import { summarizeCapabilities } from "./summary.ts";

/**
 * What each project's Framer plan allows. The API does not report the plan, so the tracker checks branch access once
 * per project and remembers every call Framer refused on plan grounds.
 */
export class CapabilityTracker {
  readonly #transports: OperationRunner;
  readonly #now: () => number;
  readonly #probes = new Map<string, Promise<CapabilityProbe>>();
  readonly #checked = new Map<string, CapabilityProbe>();
  readonly #limits = new Map<string, PlanLimit[]>();

  constructor(options: CapabilityTrackerOptions) {
    this.#transports = options.transports;
    this.#now = options.now ?? Date.now;
  }

  /** The current project's capabilities, checking branch access on first use. Null without a project. */
  async current(): Promise<Capabilities | null> {
    const project = await currentProject(this.#transports);

    if (project === null) {
      return null;
    }

    return summarizeCapabilities(await this.#probe(project.id), this.#limits.get(project.id) ?? []);
  }

  /** What is known without asking Framer, for framer_status, which must answer even when Framer does not. */
  known(): Capabilities | null {
    const project = knownProject(this.#transports);

    if (project === null) {
      return null;
    }

    const probe = this.#checked.get(project.id) ?? {
      branches: "unknown",
      detail: NOT_CHECKED_YET,
    };

    return summarizeCapabilities(probe, this.#limits.get(project.id) ?? []);
  }

  /** Remembers a call that Framer refused on plan grounds. Never throws. */
  async observe(tool: string, error: unknown): Promise<void> {
    const message = planLimitMessage(error);

    if (message === null) {
      return;
    }

    const project = await currentProject(this.#transports);

    if (project === null) {
      return;
    }

    const limits = this.#limits.get(project.id) ?? [];

    this.#limits.set(project.id, [
      ...limits.filter((limit) => limit.tool !== tool),
      {
        tool,
        message,
        at: new Date(this.#now()).toISOString(),
      },
    ]);
  }

  /** Branch access, checked once per project; concurrent callers share one check. */
  #probe(projectId: string): Promise<CapabilityProbe> {
    const checked = this.#checked.get(projectId);

    if (checked !== undefined) {
      return Promise.resolve(checked);
    }

    let pending = this.#probes.get(projectId);

    if (pending === undefined) {
      pending = this.#check(projectId);
      this.#probes.set(projectId, pending);
    }

    return pending;
  }

  /** One check. Only a definite answer is kept: after "unknown" the next call checks again. */
  async #check(projectId: string): Promise<CapabilityProbe> {
    try {
      const probe = await this.#transports.run(projectCapabilities, {});

      if (probe.branches !== "unknown") {
        this.#checked.set(projectId, probe);
      }

      return probe;
    } catch (error) {
      return {
        branches: "unknown",
        detail: `The branch check failed: ${errorMessage(error)}`,
      };
    } finally {
      this.#probes.delete(projectId);
    }
  }
}
