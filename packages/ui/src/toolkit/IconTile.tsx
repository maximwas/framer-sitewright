import { TONE_CLASSES, TONE_DOTS } from "../constants/toolkit.ts";
import type { IconTileProps } from "../types/toolkit.ts";

/** An icon on a soft square, at the start of a row; a dot on its corner says when something went wrong. */
export function IconTile({ icon: Icon, tone = "neutral", dot = null, label }: IconTileProps) {
  const className = `relative grid size-[30px] shrink-0 place-items-center rounded-lg ${TONE_CLASSES[tone]}`;
  const content = (
    <>
      <Icon aria-hidden className="size-4" />
      {dot !== null && (
        <span
          className={`absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-sw-surface ${TONE_DOTS[dot]}`}
        />
      )}
    </>
  );

  return label === undefined ? (
    <span aria-hidden className={className}>
      {content}
    </span>
  ) : (
    <span role="img" aria-label={label} className={className}>
      {content}
    </span>
  );
}
