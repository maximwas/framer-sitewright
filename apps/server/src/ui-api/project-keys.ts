import { type KeySetParams, OperationError, type ProjectKeyStatus } from "@sitewright/core";
import { verifyKey } from "../keys/verify-key.ts";
import type { UiServices } from "../types/ui-api.ts";
import { keyHint, projectUrlOf } from "../utils/project-key.ts";

/** The Server API key of the project the plugin is open in, as the journal page may see it: never the key itself. */
export function keyStatus(services: UiServices): ProjectKeyStatus {
  const project = services.shownProject?.() ?? null;
  const saved = project === null ? null : services.keys.get(project.id);

  return {
    project,
    saved:
      saved === null
        ? null
        : {
            keyHint: keyHint(saved.key),
            url: saved.url,
          },
    editorUrl: services.pluginInfo()?.editorUrl ?? null,
  };
}

/**
 * Saves a key for the project the plugin is open in, once it opens that very project: the link comes from the plugin
 * (projects with branching) or from the page. Every Sitewright session picks it up for that project.
 */
export async function saveKey(services: UiServices, { key, url }: KeySetParams): Promise<ProjectKeyStatus> {
  const project = services.shownProject?.() ?? null;

  if (project === null) {
    throw new OperationError(
      "NOT_FOUND",
      "No project to save the key for: the plugin is not open.",
      "Open the Sitewright plugin in the project and click Connect, or run `npx sitewright key` in a terminal.",
    );
  }

  const link = projectUrlOf(url ?? services.pluginInfo()?.editorUrl ?? "");

  if (link === null) {
    throw new OperationError(
      "INVALID_INPUT",
      "The project's link is needed with its key.",
      "Copy the address bar while the project is open in Framer (https://framer.com/projects/…) and paste it.",
    );
  }

  const opened = await (services.verifyKey ?? verifyKey)(link, key);

  if (opened.id !== project.id) {
    throw new OperationError(
      "INVALID_INPUT",
      `This key opens "${opened.name}", not "${project.name}".`,
      "Copy the key from this project's Site Settings → General → API Keys.",
    );
  }

  await services.keys.set({
    id: project.id,
    name: project.name,
    url: link,
    key,
  });

  return keyStatus(services);
}

export async function removeKey(services: UiServices): Promise<ProjectKeyStatus> {
  const project = services.shownProject?.() ?? null;

  if (project !== null) {
    await services.keys.remove(project.id);
  }

  return keyStatus(services);
}
