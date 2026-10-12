import { type RefObject, useEffect } from "react";

/** Keeps the plugin window as tall as the content in `ref` whenever that content changes height. */
export function useFitWindow(ref: RefObject<HTMLElement | null>, fit: (height: number) => void): void {
  useEffect(() => {
    const element = ref.current;

    if (element === null) {
      return;
    }

    let last = 0;
    const observer = new ResizeObserver(() => {
      const height = Math.ceil(element.getBoundingClientRect().height);

      if (height !== last) {
        last = height;
        fit(height);
      }
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, fit]);
}
