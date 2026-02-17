import "server-only";

import { getJsonValue, setJsonValue } from "./server-store";

export interface CachedLinkedRecord {
  id: string;
  name: string;
  metadata?: Record<string, string>;
}

interface CacheKeyInput {
  table: string;
  displayField: string;
  query: string;
  extraFields?: string[];
  sortField?: string;
  sortDirection?: "asc" | "desc";
}

declare global {
  // eslint-disable-next-line no-var
  var __submitalotLinkedSearchInflight:
    | Map<string, Promise<CachedLinkedRecord[]>>
    | undefined;
}

const CACHE_PREFIX = "submitalot:linked-search:v1:";
const FIELD_SNAPSHOT_PREFIX = "submitalot:linked-search:field:v1:";
const DEFAULT_TTL_MS = envInt(process.env.LINKED_SEARCH_CACHE_TTL_MS, 45_000);
const EMPTY_QUERY_TTL_MS = envInt(
  process.env.LINKED_SEARCH_EMPTY_CACHE_TTL_MS,
  30 * 60 * 1000
);
const FIELD_SNAPSHOT_TTL_MS = envInt(
  process.env.LINKED_SEARCH_FIELD_SNAPSHOT_TTL_MS,
  24 * 60 * 60 * 1000
);

function envInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function getInflightStore() {
  if (!globalThis.__submitalotLinkedSearchInflight) {
    globalThis.__submitalotLinkedSearchInflight = new Map();
  }
  return globalThis.__submitalotLinkedSearchInflight;
}

function normalizeFields(fields?: string[]) {
  return (fields ?? [])
    .map((field) => field.trim())
    .filter(Boolean)
    .sort()
    .join(",");
}

function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

export function makeLinkedSearchCacheKey(input: CacheKeyInput) {
  const extras = normalizeFields(input.extraFields);
  const query = normalizeQuery(input.query);
  const sortField = input.sortField?.trim() ?? "";
  const sortDirection = input.sortDirection ?? "";
  return `${CACHE_PREFIX}${input.table}|${input.displayField}|${query}|${extras}|${sortField}|${sortDirection}`;
}

export async function getLinkedSearchCache(key: string): Promise<CachedLinkedRecord[] | null> {
  return getJsonValue<CachedLinkedRecord[]>(key);
}

export async function setLinkedSearchCache(
  key: string,
  query: string,
  records: CachedLinkedRecord[]
) {
  const ttlMs = normalizeQuery(query) ? DEFAULT_TTL_MS : EMPTY_QUERY_TTL_MS;
  await setJsonValue(key, records, ttlMs);
}

export async function getLinkedSearchFieldSnapshot(
  fieldName: string
): Promise<CachedLinkedRecord[] | null> {
  return getJsonValue<CachedLinkedRecord[]>(
    `${FIELD_SNAPSHOT_PREFIX}${fieldName.trim()}`
  );
}

export async function setLinkedSearchFieldSnapshot(
  fieldName: string,
  records: CachedLinkedRecord[]
) {
  if (!fieldName.trim()) return;
  await setJsonValue(
    `${FIELD_SNAPSHOT_PREFIX}${fieldName.trim()}`,
    records,
    FIELD_SNAPSHOT_TTL_MS
  );
}

export async function runLinkedSearchWithInflight(
  key: string,
  run: () => Promise<CachedLinkedRecord[]>
): Promise<CachedLinkedRecord[]> {
  const inflight = getInflightStore();
  const existing = inflight.get(key);
  if (existing) {
    return existing;
  }

  const pending = run().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, pending);
  return pending;
}
