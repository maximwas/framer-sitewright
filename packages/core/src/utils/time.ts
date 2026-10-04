// Core has neither DOM nor Node types; both of its runtimes (the server and the plugin) have these timers.
declare const setTimeout: (callback: () => void, ms: number) => unknown;
declare const clearTimeout: (handle: unknown) => void;

/** The promise's value, or `fallback` when it takes longer than `ms`. The promise keeps running; its result is dropped. */
export async function withinTime<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: unknown;
  const late = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });

  try {
    return await Promise.race([promise, late]);
  } finally {
    clearTimeout(timer);
  }
}
