import { describe, expect, it } from "vitest";
import { REQUEST_TIMEOUT_MS } from "../src/constants/bridge.ts";
import { requestTimeoutMs } from "../src/utils/request-timeout.ts";

describe("requestTimeoutMs", () => {
  it("regression: gives a request carrying a large image minutes, not the 30 s a small one gets", () => {
    // Seen on Turi: images_upload of an 8 MB JPEG timed out after 30000 ms, without its url.
    const image = `data:image/jpeg;base64,${"A".repeat(11 * 1024 ** 2)}`;

    expect(requestTimeoutMs({ id: "node" })).toBe(REQUEST_TIMEOUT_MS + 1);
    expect(requestTimeoutMs({ image })).toBeGreaterThan(2 * 60_000);
  });
});
