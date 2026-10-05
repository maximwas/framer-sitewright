import { TriangleAlert } from "lucide-react";
import type { CapabilityBannerProps } from "../types/props.ts";
import { describeCapabilities } from "../utils/describe-capabilities.ts";

/** Says so when the project's Framer plan lacks features, so the user knows why some changes may fail. */
export function CapabilityBanner({ capabilities }: CapabilityBannerProps) {
  if (capabilities.status !== "ready" || capabilities.value === null || !capabilities.value.limited) {
    return null;
  }

  return (
    <aside className="flex gap-2.5 rounded-xl bg-sw-warn-soft px-3 py-2.5 text-[12px]">
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-sw-warn" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <strong className="font-semibold text-sw-ink">Limited Framer plan</strong>
        {describeCapabilities(capabilities.value).map((line) => (
          <p key={line} className="text-sw-ink-2">
            {line}
          </p>
        ))}
      </div>
    </aside>
  );
}
