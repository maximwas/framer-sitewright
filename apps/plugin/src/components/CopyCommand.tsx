import { SMALL_BUTTON } from "@sitewright/ui";
import { useEffect, useState } from "react";
import { COPIED_MS } from "../constants/ui.ts";
import { copyText } from "../framer/plugin.ts";
import type { CopyCommandProps } from "../types/ui.ts";

/** A command to run in a terminal, with a button that copies it. */
export function CopyCommand({ command }: CopyCommandProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => setCopied(false), COPIED_MS);

    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <div className="flex items-start gap-1.5">
      <code className="min-w-0 flex-1 select-all break-all rounded-md bg-framer-bg-secondary px-2 py-1.5 font-mono text-[11px] text-framer-text">
        {command}
      </code>
      <button
        type="button"
        className={SMALL_BUTTON}
        onClick={async () => {
          setCopied(await copyText(command));
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
