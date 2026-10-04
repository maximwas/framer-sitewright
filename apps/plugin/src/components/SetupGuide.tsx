import { SETUP_STEPS } from "../constants/setup.ts";
import type { SetupGuideProps } from "../types/ui.ts";
import { CopyCommand } from "./CopyCommand.tsx";

/** How to set Sitewright up: the setup wizard's command, and this project's optional key. */
export function SetupGuide({ open }: SetupGuideProps) {
  return (
    <details open={open} className="flex flex-col gap-2 border-framer-divider border-t pt-3">
      <summary className="cursor-pointer font-semibold text-framer-text">Set up</summary>
      <ol className="mt-2 flex flex-col gap-3">
        {SETUP_STEPS.map(({ title, note, command }) => (
          <li key={title} className="flex flex-col gap-1.5">
            <h2 className="font-semibold text-framer-text">{title}</h2>
            <p className="text-framer-text-secondary">{note}</p>
            <CopyCommand command={command} />
          </li>
        ))}
      </ol>
    </details>
  );
}
