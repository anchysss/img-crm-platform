import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, __resetRateLimit } from "@/server/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => __resetRateLimit());

  it("allows up to limit hits", () => {
    for (let i = 0; i < 5; i++) {
      const r = rateLimit("k1", 5, 1000);
      expect(r.ok).toBe(true);
    }
  });

  it("blocks when over limit", () => {
    for (let i = 0; i < 5; i++) rateLimit("k2", 5, 1000);
    const r = rateLimit("k2", 5, 1000);
    expect(r.ok).toBe(false);
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after window", async () => {
    for (let i = 0; i < 3; i++) rateLimit("k3", 3, 10);
    await new Promise((r) => setTimeout(r, 20));
    const r = rateLimit("k3", 3, 10);
    expect(r.ok).toBe(true);
  });
});
