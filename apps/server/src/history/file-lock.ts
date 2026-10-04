import { mkdir, rm, stat } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { JOURNAL_LOCK_RETRY_MS, JOURNAL_LOCK_STALE_MS, JOURNAL_LOCK_WAIT_MS } from "../constants/history.ts";

/**
 * Runs `task` while holding `<path>.lock`, a directory: mkdir either creates it or fails, atomically, across processes.
 * A lock older than JOURNAL_LOCK_STALE_MS was left by a process that died mid-write, so it is broken.
 */
export async function withFileLock<T>(path: string, task: () => Promise<T>): Promise<T> {
  const lock = `${path}.lock`;
  const deadline = Date.now() + JOURNAL_LOCK_WAIT_MS;

  while (!(await tryLock(lock))) {
    if (Date.now() > deadline) {
      throw new Error(`${lock} is held by another sitewright process.`);
    }

    await delay(JOURNAL_LOCK_RETRY_MS);
  }

  try {
    return await task();
  } finally {
    await rm(lock, {
      recursive: true,
      force: true,
    });
  }
}

async function tryLock(lock: string): Promise<boolean> {
  try {
    await mkdir(lock);

    return true;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) {
      throw error;
    }

    const age = await stat(lock).then(
      (info) => Date.now() - info.mtimeMs,
      () => 0,
    );

    if (age > JOURNAL_LOCK_STALE_MS) {
      await rm(lock, {
        recursive: true,
        force: true,
      });
    }

    return false;
  }
}
