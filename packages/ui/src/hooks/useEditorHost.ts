import { useContext } from "react";
import { EditorHostContext } from "../context/EditorHostContext.tsx";
import type { EditorHost } from "../types/host.ts";

/** The host from the nearest <EditorHostProvider>. */
export function useEditorHost(): EditorHost {
  const host = useContext(EditorHostContext);

  if (host === null) {
    throw new Error("useEditorHost must be used inside <EditorHostProvider>");
  }

  return host;
}
