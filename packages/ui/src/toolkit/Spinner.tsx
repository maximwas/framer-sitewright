/** Something is loading. */
export function Spinner() {
  return (
    <span
      role="progressbar"
      aria-label="Loading"
      className="size-5 animate-spin rounded-full border-2 border-sw-line border-t-sw-accent"
    />
  );
}
