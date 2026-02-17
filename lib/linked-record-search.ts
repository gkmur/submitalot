import "server-only";

import { fetchBaseSchema, getLinkedTableId } from "./airtable-meta";
import { listRecords } from "./airtable";
import { LINKED_RECORD_FIELDS, type LinkedRecordConfig } from "./linked-records";
import { checkRateLimit } from "./rate-limit";
import { getClientIp } from "./request";
import { shouldSample, trackTelemetry } from "./telemetry";
import { getEffectiveFieldMap } from "./runtime-admin-config";
import {
  getLinkedSearchCache,
  makeLinkedSearchCacheKey,
  runLinkedSearchWithInflight,
  setLinkedSearchCache,
  type CachedLinkedRecord,
} from "./linked-record-search-cache";

export type LinkedRecordFieldName = keyof typeof LINKED_RECORD_FIELDS;

export interface LinkedRecordSearchResult {
  records: Array<{ id: string; name: string; metadata?: Record<string, string> }>;
  error?: string;
}

type HeaderSource = Pick<Headers, "get">;

const SEARCH_WINDOW_MS = 60_000;
const SEARCH_MAX_REQUESTS = envInt(process.env.SEARCH_RATE_LIMIT_MAX, 120);
const RESOLVED_CONFIG_TTL_MS = envInt(
  process.env.LINKED_CONFIG_CACHE_TTL_MS,
  10 * 60 * 1000
);

declare global {
  // eslint-disable-next-line no-var
  var __submitalotLinkedConfigCache:
    | Map<LinkedRecordFieldName, { config: LinkedRecordConfig; expiresAt: number }>
    | undefined;
}

function envInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function now() {
  return Date.now();
}

function getConfigCache() {
  if (!globalThis.__submitalotLinkedConfigCache) {
    globalThis.__submitalotLinkedConfigCache = new Map();
  }
  return globalThis.__submitalotLinkedConfigCache;
}

function findInventoryTable(
  schema: Awaited<ReturnType<typeof fetchBaseSchema>>
) {
  return (
    schema.tables.find((t) => t.name === "Inventory") ??
    schema.tables.find((t) => t.name.toLowerCase().includes("inventory")) ??
    null
  );
}

function findFieldCaseInsensitive<T extends { name: string }>(
  fields: T[],
  fieldName: string
): T | undefined {
  const target = fieldName.trim().toLowerCase();
  return fields.find((f) => f.name.toLowerCase() === target);
}

function hasField(
  fields: Array<{ name: string }>,
  fieldName: string | undefined
) {
  if (!fieldName) return false;
  return fields.some((field) => field.name === fieldName);
}

function sanitizeQuery(query: string) {
  return query.replace(/["\\\n\r]/g, "").trim();
}

function buildFilterFormula(query: string, displayField: string) {
  if (!query) return undefined;
  return `SEARCH(LOWER("${query}"), LOWER({${displayField}}))`;
}

function coerceFieldValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const text = value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (typeof entry === "number" || typeof entry === "boolean") {
          return String(entry);
        }
        if (entry && typeof entry === "object") {
          const named = (entry as { name?: unknown }).name;
          if (typeof named === "string") return named;
        }
        return "";
      })
      .filter(Boolean)
      .join(", ");
    return text;
  }
  if (value && typeof value === "object") {
    const named = (value as { name?: unknown }).name;
    if (typeof named === "string") return named;
  }
  return "";
}

function pickDisplayName(fields: Record<string, unknown>, displayField: string) {
  const preferred = coerceFieldValue(fields[displayField]).trim();
  if (preferred) return preferred;

  for (const value of Object.values(fields)) {
    const asText = coerceFieldValue(value).trim();
    if (asText) return asText;
  }
  return "";
}

function isRecoverableAirtableSchemaError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("unknown_field_name") ||
    normalized.includes("unknown field") ||
    normalized.includes("invalid_filter_by_formula") ||
    normalized.includes("formula") ||
    normalized.includes("cannot sort") ||
    normalized.includes("sort")
  );
}

function normalizeErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

function mapAirtableRecords(
  records: Array<{ id: string; fields: Record<string, unknown> }>,
  config: LinkedRecordConfig,
  query: string
): CachedLinkedRecord[] {
  const normalizedQuery = query.toLowerCase();
  const previewFields = config.previewFields ?? [];

  return records
    .map((record): CachedLinkedRecord => {
      const name = pickDisplayName(record.fields, config.displayField);
      const metadata: Record<string, string> = {};

      for (const fieldName of previewFields) {
        const value = coerceFieldValue(record.fields[fieldName]).trim();
        if (value) metadata[fieldName] = value;
      }

      return {
        id: record.id,
        name,
        metadata: Object.keys(metadata).length ? metadata : undefined,
      };
    })
    .filter((record) => {
      if (!record.name) return false;
      if (!normalizedQuery) return true;
      return record.name.toLowerCase().includes(normalizedQuery);
    });
}

async function resolveLinkedRecordConfig(
  fieldName: LinkedRecordFieldName
): Promise<LinkedRecordConfig> {
  const fallback = LINKED_RECORD_FIELDS[fieldName];
  if (!fallback) {
    throw new Error(`Unsupported linked record field: ${fieldName}`);
  }

  const cache = getConfigCache();
  const cached = cache.get(fieldName);
  if (cached && cached.expiresAt > now()) {
    return cached.config;
  }

  let resolved = fallback;

  try {
    const [schema, effectiveMap] = await Promise.all([
      fetchBaseSchema(),
      getEffectiveFieldMap(),
    ]);
    const inventoryTable = findInventoryTable(schema);
    const mappedFieldName = effectiveMap[fieldName];

    if (inventoryTable && mappedFieldName) {
      const inventoryField = findFieldCaseInsensitive(
        inventoryTable.fields,
        mappedFieldName
      );
      const linkedTableId = inventoryField
        ? getLinkedTableId(inventoryField)
        : undefined;
      const linkedTable = linkedTableId
        ? schema.tables.find((table) => table.id === linkedTableId)
        : undefined;

      if (linkedTable) {
        const primaryField =
          linkedTable.fields.find((field) => field.id === linkedTable.primaryFieldId) ??
          linkedTable.fields[0];

        const displayField = primaryField?.name ?? fallback.displayField;
        const previewFields = (fallback.previewFields ?? []).filter((fieldName) =>
          hasField(linkedTable.fields, fieldName)
        );
        const sortField = hasField(linkedTable.fields, fallback.sortField)
          ? fallback.sortField
          : displayField;

        resolved = {
          ...fallback,
          table: linkedTable.name,
          displayField,
          previewFields,
          sortField,
        };
      }
    }
  } catch {
    resolved = fallback;
  }

  cache.set(fieldName, {
    config: resolved,
    expiresAt: now() + RESOLVED_CONFIG_TTL_MS,
  });

  return resolved;
}

async function listWithFallbacks(
  config: LinkedRecordConfig,
  query: string
): Promise<Array<{ id: string; fields: Record<string, unknown> }>> {
  const safeQuery = sanitizeQuery(query);
  const allFields = [
    config.displayField,
    ...(config.previewFields ?? []),
  ].filter(Boolean);

  const attempts: Array<{
    includeSort: boolean;
    includeFilter: boolean;
    includeFields: boolean;
  }> = [];

  function pushAttempt(
    includeSort: boolean,
    includeFilter: boolean,
    includeFields: boolean
  ) {
    const key = `${includeSort ? 1 : 0}${includeFilter ? 1 : 0}${includeFields ? 1 : 0}`;
    if (attempts.some((attempt) =>
      `${attempt.includeSort ? 1 : 0}${attempt.includeFilter ? 1 : 0}${attempt.includeFields ? 1 : 0}` === key
    )) {
      return;
    }
    attempts.push({ includeSort, includeFilter, includeFields });
  }

  pushAttempt(Boolean(config.sortField), Boolean(safeQuery), true);
  pushAttempt(false, Boolean(safeQuery), true);
  pushAttempt(false, false, true);
  pushAttempt(false, false, false);

  let lastError: Error | null = null;

  for (const attempt of attempts) {
    const sort = attempt.includeSort && config.sortField
      ? {
        field: config.sortField,
        direction: config.sortDirection ?? "asc",
      }
      : undefined;

    const filterFormula = attempt.includeFilter
      ? buildFilterFormula(safeQuery, config.displayField)
      : undefined;

    const fields = attempt.includeFields ? allFields : undefined;

    try {
      return await listRecords(config.table, {
        fields,
        maxRecords: 100,
        filterFormula,
        sort,
      });
    } catch (err) {
      const message = normalizeErrorMessage(err);
      lastError = err instanceof Error ? err : new Error(message);

      if (!isRecoverableAirtableSchemaError(message)) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error("Linked record lookup failed");
}

export function isLinkedRecordFieldName(value: string): value is LinkedRecordFieldName {
  return Object.prototype.hasOwnProperty.call(LINKED_RECORD_FIELDS, value);
}

export async function searchLinkedRecordsForField(
  fieldName: LinkedRecordFieldName,
  query: string,
  requestHeaders: HeaderSource
): Promise<LinkedRecordSearchResult> {
  const startedAt = now();
  const sample = shouldSample();
  const ip = getClientIp(requestHeaders);

  const config = await resolveLinkedRecordConfig(fieldName);
  const sanitizedQuery = sanitizeQuery(query);

  const cacheKey = makeLinkedSearchCacheKey({
    table: config.table,
    displayField: config.displayField,
    query: sanitizedQuery,
    extraFields: config.previewFields,
    sortField: config.sortField,
    sortDirection: config.sortDirection,
  });

  const cached = await getLinkedSearchCache(cacheKey);
  if (cached) {
    if (sample) {
      trackTelemetry("linked_search.cache_hit", {
        ip,
        fieldName,
        table: config.table,
        queryLength: query.length,
        count: cached.length,
        durationMs: now() - startedAt,
      });
    }
    return { records: cached };
  }

  try {
    const limit = await checkRateLimit(`search-linked:${ip}`, {
      windowMs: SEARCH_WINDOW_MS,
      max: SEARCH_MAX_REQUESTS,
    });

    if (!limit.allowed) {
      if (sample) {
        trackTelemetry(
          "linked_search.rate_limited",
          { ip, retryAfterMs: limit.retryAfterMs, fieldName },
          "warn"
        );
      }
      return {
        records: [],
        error: "Too many linked record searches. Please wait a moment and try again.",
      };
    }

    const records = await runLinkedSearchWithInflight(cacheKey, async () => {
      const rawRecords = await listWithFallbacks(config, sanitizedQuery);
      return mapAirtableRecords(rawRecords, config, sanitizedQuery);
    });

    await setLinkedSearchCache(cacheKey, sanitizedQuery, records);

    if (sample) {
      trackTelemetry("linked_search.success", {
        ip,
        fieldName,
        table: config.table,
        queryLength: query.length,
        count: records.length,
        durationMs: now() - startedAt,
      });
    }

    return { records };
  } catch (err) {
    const message = normalizeErrorMessage(err);
    if (sample) {
      trackTelemetry(
        "linked_search.error",
        {
          ip,
          fieldName,
          table: config.table,
          message,
          durationMs: now() - startedAt,
        },
        "error"
      );
    }

    if (/timed out/i.test(message)) {
      return {
        records: [],
        error: "Linked record lookup timed out. Please try again.",
      };
    }

    return {
      records: [],
      error: "Unable to load linked records right now. Please try again.",
    };
  }
}
