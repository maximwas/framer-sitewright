import { BridgeError } from "@sitewright/core";

/**
 * Runs `work` unless `deadline` has passed already, and rejects with TIMEOUT once it passes. The work itself cannot be
 * cancelled (Framer keeps going), so the race also absorbs its late rejection.
 */
export async function runBeforeDeadline<T>(work: () => Promise<T>, deadline: number, label: string): Promise<T> {
  if (Date.now() >= deadline) {
    throw new BridgeError("TIMEOUT", `${label}: deadline passed while queued; not executed`);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    const timeout = () => reject(new BridgeError("TIMEOUT", `${label}: deadline exceeded`));

    timer = setTimeout(timeout, deadline - Date.now());
  });

  try {
    return await Promise.race([work(), expired]);
  } finally {
    clearTimeout(timer);
  }
}
