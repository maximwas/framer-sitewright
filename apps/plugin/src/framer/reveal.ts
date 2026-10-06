import type { RevealEditor } from "../types/reveal.ts";

/**
 * Shows a layer in the editor. Framer cannot open some layers by themselves (a variant inside a component): then the
 * nearest ancestor it can open is shown, its component, and the note names both, never by id.
 */
export async function revealNode(editor: RevealEditor, id: string): Promise<void> {
  const nameOf = async (nodeId: string) => (await editor.getNode(nodeId).catch(() => null))?.name ?? "the layer";
  let current: string | null = id;

  while (current !== null) {
    const opened = await editor.navigateTo(current).then(
      () => true,
      () => false,
    );

    if (opened) {
      if (current !== id) {
        editor.notify(`Opened ${await nameOf(current)}, which holds ${await nameOf(id)}.`, "info");
      }

      return;
    }

    current = (await editor.getParent(current).catch(() => null))?.id ?? null;
  }

  editor.notify(`Could not open ${await nameOf(id)} in the editor.`, "warning");
}
