import type { LinkedRecord } from "./types";

type CacheEntry = {
  value: LinkedRecord[];
  expiresAt: number;
};

const CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_ENTRIES = 300;

declare global {
  // eslint-disable-next-line no-var
  var __submitalotLinkedRecordCache: Map<string, CacheEntry> | undefined;
}

function getStore() {
  if (!globalThis.__submitalotLinkedRecordCache) {
    globalThis.__submitalotLinkedRecordCache = new Map();
  }
  return globalThis.__submitalotLinkedRecordCache;
}

function pruneExpired(now: number) {
  const store = getStore();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

function enforceSizeLimit() {
  const store = getStore();
  if (store.size <= MAX_ENTRIES) return;

  const oldestKey = store.keys().next().value;
  if (oldestKey) {
    store.delete(oldestKey);
  }
}

export function getLinkedRecordCache(key: string): LinkedRecord[] | null {
  const now = Date.now();
  const store = getStore();
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function setLinkedRecordCache(key: string, value: LinkedRecord[]) {
  const now = Date.now();
  const store = getStore();
  if (store.size > MAX_ENTRIES) {
    pruneExpired(now);
  }
  store.set(key, { value, expiresAt: now + CACHE_TTL_MS });
  enforceSizeLimit();
}

export function makeLinkedRecordCacheKey(input: {
  fieldName?: string;
  table: string;
  displayField: string;
  query: string;
  extraFields?: string[];
  sortField?: string;
  sortDirection?: "asc" | "desc";
}) {
  const extras = (input.extraFields ?? []).slice().sort().join(",");
  const q = input.query.trim().toLowerCase();
  const base = input.fieldName?.trim()
    ? `field:${input.fieldName.trim()}`
    : `${input.table}|${input.displayField}`;
  return `${base}|${q}|${extras}|${input.sortField ?? ""}|${input.sortDirection ?? ""}`;
}
