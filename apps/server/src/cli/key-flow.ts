import { confirm, log, note, password, select, spinner, text } from "@clack/prompts";
import { errorMessage } from "@sitewright/core";
import type { KeyStore } from "../keys/key-store.ts";
import { verifyKey } from "../keys/verify-key.ts";
import { keyHint, projectUrlOf } from "../utils/project-key.ts";
import { answered } from "./cancel.ts";
import { fetchLocalStatus } from "./local-status.ts";

/**
 * Adds one project's Server API key: the project the plugin is open in when a server runs, else the link the person
 * pastes; the key is typed hidden, checked by opening the project, and saved to keys.json. Resolves with the project's
 * name, or null when the person chose not to.
 */
export async function addKeyFlow(store: KeyStore, bridgeFile: string): Promise<string | null> {
  const status = await fetchLocalStatus(bridgeFile);
  const plugin = status?.plugin ?? null;
  const open = plugin?.project ?? null;
  let url = plugin?.editorUrl ?? null;

  if (open !== null) {
    note(`The plugin is open in "${open.name}".`, "Framer");

    const forOpen = answered(await confirm({ message: `Add a Server API key for "${open.name}"?` }));

    if (!forOpen) {
      url = null;
    }
  }

  url ??= projectUrlOf(
    answered(
      await text({
        message: "Project link (the address bar while the project is open in Framer)",
        placeholder: "https://framer.com/projects/…",
        validate: (value) =>
          projectUrlOf(value ?? "") === null ? "Paste a https://framer.com/projects/… link" : undefined,
      }),
    ),
  );

  if (url === null) {
    return null;
  }

  for (;;) {
    const key = answered(
      await password({
        message: "Server API key (Framer: Site Settings → General → API Keys)",
        validate: (value) => ((value ?? "").trim() === "" ? "Paste the key" : undefined),
      }),
    ).trim();
    const checking = spinner();

    checking.start("Opening the project with this key…");

    try {
      // Opening the project by its link proves the key belongs to it.
      const project = await verifyKey(url, key);

      await store.set({
        id: project.id,
        name: project.name,
        url,
        key,
      });
      checking.stop(`Saved the key for "${project.name}" (${keyHint(key)}).`);

      return project.name;
    } catch (error) {
      checking.error(errorMessage(error));

      if (!answered(await confirm({ message: "Try another key?" }))) {
        return null;
      }
    }
  }
}

/** The saved projects, without their keys. */
export function listKeys(store: KeyStore): void {
  const projects = store.list();

  if (projects.length === 0) {
    log.info("No keys saved yet. Add one with `sitewright key`.");

    return;
  }

  note(
    projects.map((project) => `${project.name}  ${keyHint(project.key)}  ${project.url}`).join("\n"),
    "Server API keys",
  );
}

/** Lets the person pick a saved project and forget its key. */
export async function removeKeyFlow(store: KeyStore): Promise<void> {
  const projects = store.list();

  if (projects.length === 0) {
    log.info("No keys saved.");

    return;
  }

  const id = answered(
    await select({
      message: "Forget the key of which project?",
      options: projects.map((project) => ({
        value: project.id,
        label: project.name,
        hint: keyHint(project.key),
      })),
    }),
  );

  await store.remove(id);
  log.success("Removed. Sitewright works through the plugin there until a new key is added.");
}
