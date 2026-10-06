import type { LucideIcon } from "lucide-react";
import { OPERATION_ICONS } from "../constants/ui.ts";

/** The icon of the operation an entry ran: its own, else its family's; null when the panel has none for it. */
export function operationIcon(operation: string | null): LucideIcon | null {
  if (operation === null) {
    return null;
  }

  return OPERATION_ICONS[operation] ?? OPERATION_ICONS[operation.split(".")[0] ?? ""] ?? null;
}
