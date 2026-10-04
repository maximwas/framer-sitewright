import type { CapabilityBannerProps } from "../types/props.ts";
import { describeCapabilities } from "../utils/describe-capabilities.ts";

/** Says so when the project's Framer plan lacks features, so the user knows why some changes may fail. */
export function CapabilityBanner({ capabilities }: CapabilityBannerProps) {
  if (capabilities.status !== "ready" || capabilities.value === null || !capabilities.value.limited) {
    return null;
  }

  return (
    <aside className="flex flex-col gap-0.5 rounded-lg bg-amber-500/15 px-2.5 py-2">
      <strong className="font-semibold text-framer-text">Limited Framer plan</strong>
      {describeCapabilities(capabilities.value).map((line) => (
        <p key={line}>{line}</p>
      ))}
    </aside>
  );
}
