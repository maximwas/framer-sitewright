/** What revealNode needs from the editor: Framer's own methods, or fakes in tests. */
export interface RevealEditor {
  navigateTo(id: string): Promise<unknown>;
  getParent(id: string): Promise<{ readonly id: string } | null>;
  getNode(id: string): Promise<{ readonly id: string; readonly name?: string | null } | null>;
  notify(message: string, variant: "info" | "warning"): void;
}
