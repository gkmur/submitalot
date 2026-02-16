import "server-only";

import { incrementWindowCounter } from "./server-store";

type RateLimitConfig = {
  windowMs: number;
  max: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  resetAt: number;
};

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const counter = await incrementWindowCounter(key, config.windowMs);
  const remaining = Math.max(0, config.max - counter.count);
  const allowed = counter.count <= config.max;

  return {
    allowed,
    remaining,
    retryAfterMs: allowed ? 0 : counter.retryAfterMs,
    resetAt: now + counter.retryAfterMs,
  };
}
