import { createContext } from "react";
import type { EditorHost } from "../types/host.ts";
import type { EditorHostProviderProps } from "../types/props.ts";

/** Where the panel runs (the plugin, the web app); read it with useEditorHost(). */
export const EditorHostContext = createContext<EditorHost | null>(null);

export function EditorHostProvider({ host, children }: EditorHostProviderProps) {
  return <EditorHostContext.Provider value={host}>{children}</EditorHostContext.Provider>;
}
