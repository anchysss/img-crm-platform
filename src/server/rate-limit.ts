/**
 * Mini in-memory rate limiter. Za produkciju: Redis/Upstash.
 * PZ 4.1 + 5: rate limit na login; sliding window.
 */
interface Bucket {
  hits: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { hits: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }
  if (b.hits >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: b.resetAt - now };
  }
  b.hits++;
  return { ok: true, remaining: limit - b.hits, retryAfterMs: 0 };
}

// Eksport za testove
export function __resetRateLimit() {
  buckets.clear();
}
