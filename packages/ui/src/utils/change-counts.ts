import type { ActivityItem } from "../types/activity.ts";

/** How many of the items were created, updated and deleted, in that order, leaving out the kinds with none. */
export function changeCounts(items: readonly ActivityItem[]): { change: ActivityItem["change"]; count: number }[] {
  return (["created", "updated", "deleted"] as const).flatMap((change) => {
    const count = items.filter((item) => item.change === change).length;

    return count === 0
      ? []
      : [
          {
            change,
            count,
          },
        ];
  });
}
