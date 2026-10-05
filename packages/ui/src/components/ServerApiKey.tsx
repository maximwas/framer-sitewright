import { KeyRound } from "lucide-react";
import { useState } from "react";
import { FIELD } from "../constants/toolkit.ts";
import { useProjectKey } from "../hooks/useProjectKey.ts";
import { Button } from "../toolkit/Button.tsx";

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

  const card = "flex flex-col gap-2 rounded-xl border border-sw-line bg-sw-surface px-3 py-2.5 text-[12px]";

  if (status.project === null) {
    return (
      <p className={`${card} text-sw-ink-2`}>
        <span>
          Open the Sitewright plugin in a project to add its Server API key here, or run{" "}
          <code className="rounded bg-sw-surface-2 px-1 font-mono text-sw-ink">npx sitewright key</code>.
        </span>
      </p>
    );
  }

  if (status.saved !== null) {
    return (
      <div className={`${card} flex-row items-center`}>
        <KeyRound aria-hidden className="size-4 shrink-0 text-sw-ok" />
        <p className="min-w-0 flex-1 text-sw-ink">
          Server API key {status.saved.keyHint} for <span className="font-semibold">{status.project.name}</span>
        </p>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void remove()}>
          Remove
        </Button>
      </div>
    );
  }

  return (
    <form
      className={card}
      onSubmit={async (event) => {
        event.preventDefault();

        if (await save(key, status.editorUrl === null ? url : undefined)) {
          setKey("");
          setUrl("");
        }
      }}
    >
      <p className="flex items-center gap-2 font-semibold text-sw-ink">
        <KeyRound aria-hidden className="size-4 text-sw-accent" />
        Server API key for {status.project.name}
      </p>
      <p className="text-sw-ink-2">
        Adds effects, variants, components, rich text, screenshots and catalogs. Framer: Site Settings → General → API
        Keys. It stays on this computer.
      </p>
      {status.editorUrl === null && (
        <input
          type="url"
          className={FIELD}
          required
          placeholder="Project link: the address bar while the project is open"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      )}
      <input
        type="password"
        className={FIELD}
        required
        autoComplete="off"
        placeholder="Server API key"
        value={key}
        onChange={(event) => setKey(event.target.value)}
      />
      <Button type="submit" variant="primary" disabled={busy} className="self-start">
        {busy ? "Checking…" : "Save key"}
      </Button>
    </form>
  );
}
