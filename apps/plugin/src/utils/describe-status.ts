import { STATUS_COPY, STOP_COPY, STOPPED_COPY } from "../constants/ui.ts";
import type { LinkStatus } from "../types/link.ts";
import type { StatusCopy } from "../types/ui.ts";

/** What the plugin window says for a link state. */
export function describeStatus(status: LinkStatus): StatusCopy {
  if (status.state !== "stopped") {
    return STATUS_COPY[status.state];
  }

  return (status.closeCode === null ? undefined : STOP_COPY[status.closeCode]) ?? STOPPED_COPY;
}
