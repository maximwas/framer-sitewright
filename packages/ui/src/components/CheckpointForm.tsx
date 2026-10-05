import { useEffect, useRef, useState } from "react";
import { FIELD } from "../constants/toolkit.ts";
import { Button } from "../toolkit/Button.tsx";
import type { CheckpointFormProps } from "../types/props.ts";

/** Names a checkpoint: what the user is about to start, so the project can be restored to this point. */
export function CheckpointForm({ busy, onSave, onCancel }: CheckpointFormProps) {
  const [label, setLabel] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const trimmed = label.trim();

  useEffect(() => input.current?.focus(), []);

  return (
    <form
      className="flex items-center gap-1.5 rounded-xl border border-sw-line bg-sw-surface p-1.5"
      onSubmit={(event) => {
        event.preventDefault();

        if (trimmed !== "") {
          void onSave(trimmed);
        }
      }}
    >
      <input
        ref={input}
        className={`${FIELD} min-w-0 flex-1 border-transparent`}
        placeholder="What starts here?"
        maxLength={120}
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel();
          }
        }}
      />
      <Button type="submit" variant="primary" disabled={busy || trimmed === ""}>
        Mark
      </Button>
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}
