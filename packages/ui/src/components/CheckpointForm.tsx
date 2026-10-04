import { useEffect, useRef, useState } from "react";
import { ROW_BUTTON } from "../constants/ui.ts";
import type { CheckpointFormProps } from "../types/props.ts";

/** Names a checkpoint: what the user is about to start, so the project can be restored to this point. */
export function CheckpointForm({ busy, onSave, onCancel }: CheckpointFormProps) {
  const [label, setLabel] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const trimmed = label.trim();

  useEffect(() => input.current?.focus(), []);

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();

        if (trimmed !== "") {
          void onSave(trimmed);
        }
      }}
    >
      <input
        ref={input}
        className="w-auto min-w-0 flex-[2]"
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
      <button type="submit" className={`framer-button-primary ${ROW_BUTTON}`} disabled={busy || trimmed === ""}>
        Mark
      </button>
      <button type="button" className={ROW_BUTTON} onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}
