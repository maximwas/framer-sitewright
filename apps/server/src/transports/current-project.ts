import { projectInfo } from "@sitewright/core";
import type { OperationRunner, ProjectRef } from "../types/transports.ts";

/** The project the active transport edits. Connects the Server API once if it has not connected yet. */
export async function currentProject(transports: OperationRunner): Promise<ProjectRef | null> {
  return knownProject(transports) ?? transports.run(projectInfo, {}).catch(() => null);
}

/** The active transport's project if it is already known, without asking Framer. */
export function knownProject(transports: Pick<OperationRunner, "status">): ProjectRef | null {
  const status = transports.status();

  return status.transports.find((transport) => transport.transport === status.active)?.project ?? null;
}
