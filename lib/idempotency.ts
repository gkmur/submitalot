import "server-only";

import { createHash } from "crypto";
import { getJsonValue, setJsonValue } from "./server-store";

export interface IdempotencyEntry<T> {
  payloadHash: string;
  response: T;
  status: number;
  expiresAt: number;
}

const IDEMPOTENCY_PREFIX = "submitalot:idempotency:";

function toKey(key: string) {
  return `${IDEMPOTENCY_PREFIX}${key}`;
}

export function hashPayload(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

export async function getIdempotencyEntry<T>(key: string): Promise<IdempotencyEntry<T> | null> {
  const entry = await getJsonValue<IdempotencyEntry<T>>(toKey(key));
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) return null;
  return entry;
}

export async function setIdempotencyEntry<T>(
  key: string,
  payloadHash: string,
  response: T,
  status: number,
  ttlMs = 24 * 60 * 60 * 1000
) {
  const entry: IdempotencyEntry<T> = {
    payloadHash,
    response,
    status,
    expiresAt: Date.now() + ttlMs,
  };

  await setJsonValue(toKey(key), entry, ttlMs);
}
