const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});
const dayFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
});

/** "21:14" for today, "29 Sep, 21:14" for other days, in the user's locale. */
export function formatTime(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const time = timeFormat.format(at);

  return at.toDateString() === now.toDateString() ? time : `${dayFormat.format(at)}, ${time}`;
}
