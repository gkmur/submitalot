import "server-only";

import { Redis } from "@upstash/redis";

type MemoryEntry = {
  value: string;
  expiresAt: number | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __submitalotMemoryStore: Map<string, MemoryEntry> | undefined;
  // eslint-disable-next-line no-var
  var __submitalotRedisClient: Redis | null | undefined;
}

function now() {
  return Date.now();
}

function getMemoryStore() {
  if (!globalThis.__submitalotMemoryStore) {
    globalThis.__submitalotMemoryStore = new Map();
  }
  return globalThis.__submitalotMemoryStore;
}

function readMemoryValue(key: string) {
  const store = getMemoryStore();
  const entry = store.get(key);
  if (!entry) return null;

  if (entry.expiresAt !== null && entry.expiresAt <= now()) {
    store.delete(key);
    return null;
  }

  return entry;
}

function writeMemoryValue(key: string, value: string, ttlMs?: number) {
  const store = getMemoryStore();
  const expiresAt = ttlMs && ttlMs > 0 ? now() + ttlMs : null;
  store.set(key, { value, expiresAt });
}

function getRedisClient(): Redis | null {
  if (globalThis.__submitalotRedisClient !== undefined) {
    return globalThis.__submitalotRedisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    globalThis.__submitalotRedisClient = null;
    return null;
  }

  globalThis.__submitalotRedisClient = Redis.fromEnv();
  return globalThis.__submitalotRedisClient;
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getJsonValue<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get<string>(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  const entry = readMemoryValue(key);
  if (!entry) return null;

  try {
    return JSON.parse(entry.value) as T;
  } catch {
    return null;
  }
}

export async function setJsonValue(key: string, value: unknown, ttlMs: number) {
  const serialized = JSON.stringify(value);
  const redis = getRedisClient();
  if (redis) {
    await redis.set(key, serialized, { px: ttlMs });
    return;
  }

  writeMemoryValue(key, serialized, ttlMs);
}

export async function incrementWindowCounter(
  key: string,
  windowMs: number
): Promise<{ count: number; retryAfterMs: number }> {
  const redis = getRedisClient();
  if (redis) {
    const count = asNumber(await redis.incr(key), 0);

    if (count === 1) {
      await redis.pexpire(key, windowMs);
      return { count, retryAfterMs: windowMs };
    }

    let ttl = asNumber(await redis.pttl(key), windowMs);
    if (ttl < 0) {
      await redis.pexpire(key, windowMs);
      ttl = windowMs;
    }

    return { count, retryAfterMs: ttl };
  }

  const entry = readMemoryValue(key);
  if (!entry) {
    writeMemoryValue(key, "1", windowMs);
    return { count: 1, retryAfterMs: windowMs };
  }

  const count = asNumber(entry.value, 0) + 1;
  const expiresAt = entry.expiresAt ?? now() + windowMs;
  const retryAfterMs = Math.max(0, expiresAt - now());
  getMemoryStore().set(key, { value: String(count), expiresAt });

  return { count, retryAfterMs };
}
