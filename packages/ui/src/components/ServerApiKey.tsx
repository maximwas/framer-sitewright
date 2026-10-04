import { useState } from "react";
import { SMALL_BUTTON } from "../constants/ui.ts";
import { useProjectKey } from "../hooks/useProjectKey.ts";

/**
 * The Server API key of the project the plugin is open in: what it adds, whether one is saved, and a form to save one
 * (with the project's link when the plugin could not give it). The key never comes back from the server.
 */
export function ServerApiKey() {
  const { status, busy, save, remove } = useProjectKey();
  const [key, setKey] = useState("");
  const [url, setUrl] = useState("");

  if (status === null) {
    return null;
  }

  if (status.project === null) {
    return (
      <p className="rounded-lg bg-framer-bg-secondary p-2.5 text-framer-text-secondary">
        Open the Sitewright plugin in a project to add its Server API key here, or run{" "}
        <code className="font-mono">npx sitewright key</code>.
      </p>
    );
  }

  if (status.saved !== null) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-framer-bg-secondary p-2.5">
        <p className="min-w-0 flex-1 text-framer-text">
          Server API key {status.saved.keyHint} for <span className="font-semibold">{status.project.name}</span>
        </p>
        <button type="button" className={SMALL_BUTTON} disabled={busy} onClick={() => void remove()}>
          Remove
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-2 rounded-lg bg-framer-bg-secondary p-2.5"
      onSubmit={async (event) => {
        event.preventDefault();

        if (await save(key, status.editorUrl === null ? url : undefined)) {
          setKey("");
          setUrl("");
        }
      }}
    >
      <p className="font-semibold text-framer-text">Server API key for {status.project.name}</p>
      <p className="text-framer-text-secondary">
        Adds effects, variants, components, rich text, screenshots and catalogs. Framer: Site Settings → General → API
        Keys. It stays on this computer.
      </p>
      {status.editorUrl === null && (
        <input
          type="url"
          className="w-full"
          required
          placeholder="Project link: the address bar while the project is open"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      )}
      <input
        type="password"
        className="w-full"
        required
        autoComplete="off"
        placeholder="Server API key"
        value={key}
        onChange={(event) => setKey(event.target.value)}
      />
      <button type="submit" className="framer-button-primary" disabled={busy}>
        {busy ? "Checking…" : "Save key"}
      </button>
    </form>
  );
}
