import { BADGE_TEXT, CATEGORY_BADGES, CHANGE_BADGES, ITEM_ICONS, READ_BADGE } from "../constants/ui.ts";
import { useEditorHost } from "../hooks/useEditorHost.ts";
import type { ItemChipProps } from "../types/props.ts";

/**
 * A token, text style or canvas node an entry touched; clicking selects it in the editor. Deleted items cannot. The
 * chip shows what was done to it as icons: the first kind of change leads and tints it, the others follow its name. A
 * deleted item is red with a bin, and a node the AI only read is a cyan badge with an eye; how many were created, updated
 * and deleted the badges above the chips say.
 */
export function ItemChip({ item, read = false }: ItemChipProps) {
  const host = useEditorHost();
  const deleted = item.change === "deleted";
  const [main, ...more] = item.categories;
  const kinds = item.categories.map((category) => CATEGORY_BADGES[category].label).join(", ");
  // A token shows its swatch; anything else the icon of its first kind of change, or of what it is.
  const mainIcon = main === undefined ? null : CATEGORY_BADGES[main].icon;
  let Icon = item.kind === "color-style" ? null : (mainIcon ?? ITEM_ICONS[item.kind]);
  let tint = main === undefined ? "bg-sw-surface-2 text-sw-ink-2" : CATEGORY_BADGES[main].className;

  if (read) {
    Icon = READ_BADGE.icon;
    tint = READ_BADGE.className;
  } else if (deleted) {
    Icon = CHANGE_BADGES.deleted.icon;
    tint = CHANGE_BADGES.deleted.className;
  }

  return (
    <button
      type="button"
      className={`flex h-6 w-auto max-w-full items-center gap-1.5 rounded-full border-0 px-2.5 font-medium text-[11px] transition-[filter] hover:brightness-95 disabled:cursor-default ${tint}`}
      disabled={deleted}
      title={`${deleted ? `${item.path} was deleted` : `Open ${item.path} in the editor`}${item.change === "created" ? ", created" : ""}${kinds === "" ? "" : ` (${kinds})`}`}
      onClick={() => void host.reveal(item)}
    >
      {Icon === null ? (
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full ring-1 ring-black/15 ring-inset"
          style={{ backgroundColor: item.swatch ?? "transparent" }}
        />
      ) : (
        <Icon aria-hidden className="size-3 shrink-0" />
      )}
      <span
        className={`overflow-x-clip text-ellipsis whitespace-nowrap ${BADGE_TEXT} ${deleted ? "line-through" : ""}`}
      >
        {item.path}
      </span>
      {!deleted &&
        !read &&
        more.map((category) => {
          const { icon: More } = CATEGORY_BADGES[category];

          return <More key={category} aria-hidden className="size-3 shrink-0 opacity-70" />;
        })}
    </button>
  );
}
