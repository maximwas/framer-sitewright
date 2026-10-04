import { ErrorCode, type Framer, FramerAPIError } from "framer-api";
import { describe, expect, it, vi } from "vitest";
import { createLogger } from "../src/logging/logger.ts";
import { ServerApiSession } from "../src/transports/server-api/session.ts";
import type { ConnectFn } from "../src/types/transports.ts";

function fakeFramer(): Framer {
  return { disconnect: vi.fn(async () => undefined) } as unknown as Framer;
}

const projectClosed = () => new FramerAPIError("closed", ErrorCode.PROJECT_CLOSED);

function session(connectFn: ConnectFn, delays: number[] = []) {
  return new ServerApiSession({
    projectUrl: "https://framer.com/projects/Site--abc",
    apiKey: "key",
    logger: createLogger("silent"),
    connectFn,
    sleep: async (ms) => {
      delays.push(ms);
    },
  });
}

describe("ServerApiSession", () => {
  it("connects lazily and only once for concurrent callers", async () => {
    const framer = fakeFramer();
    const connectFn = vi.fn(async () => framer);
    const subject = session(connectFn);

    expect(subject.connected).toBe(false);

    const [a, b] = await Promise.all([subject.getFramer(), subject.getFramer()]);

    expect(a).toBe(framer);
    expect(b).toBe(framer);
    expect(connectFn).toHaveBeenCalledTimes(1);
    expect(subject.connected).toBe(true);
  });

  it("retries retryable connect errors with backoff", async () => {
    const framer = fakeFramer();
    const delays: number[] = [];
    const connectFn = vi
      .fn<ConnectFn>()
      .mockRejectedValueOnce(new FramerAPIError("busy", ErrorCode.POOL_EXHAUSTED))
      .mockRejectedValueOnce(new FramerAPIError("busy", ErrorCode.POOL_EXHAUSTED))
      .mockResolvedValueOnce(framer);

    await expect(session(connectFn, delays).getFramer()).resolves.toBe(framer);
    expect(delays).toEqual([1000, 2000]);
  });

  it("does not retry non-retryable errors", async () => {
    const connectFn = vi.fn(async (): Promise<Framer> => {
      throw new FramerAPIError("bad key", ErrorCode.UNAUTHORIZED);
    });

    await expect(session(connectFn).getFramer()).rejects.toThrow("bad key");
    expect(connectFn).toHaveBeenCalledTimes(1);
  });

  it("reconnects once when the session is lost during a call", async () => {
    const first = fakeFramer();
    const second = fakeFramer();
    const connectFn = vi.fn<ConnectFn>().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const subject = session(connectFn);
    const work = vi
      .fn<(framer: Framer) => Promise<string>>()
      .mockRejectedValueOnce(projectClosed())
      .mockResolvedValueOnce("done");

    await expect(subject.run(work, { replay: true })).resolves.toBe("done");
    expect(work).toHaveBeenLastCalledWith(second);
    expect(first.disconnect).toHaveBeenCalledTimes(1);
  });

  it("regression: a late failure on a dropped connection keeps the fresh one", async () => {
    const first = fakeFramer();
    const second = fakeFramer();
    const connectFn = vi.fn<ConnectFn>().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const subject = session(connectFn);
    const lateFailure = Promise.withResolvers<void>();
    const slow = subject.run(
      async (framer) => {
        if (framer !== first) {
          return "slow";
        }

        await lateFailure.promise;

        throw projectClosed();
      },
      { replay: true },
    );
    const fast = subject.run(
      async (framer) => {
        if (framer === first) {
          throw projectClosed();
        }

        return "fast";
      },
      { replay: true },
    );

    await expect(fast).resolves.toBe("fast");
    lateFailure.resolve();
    await expect(slow).resolves.toBe("slow");
    expect(connectFn).toHaveBeenCalledTimes(2);
    expect(second.disconnect).not.toHaveBeenCalled();
  });
});
