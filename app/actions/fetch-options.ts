"use server";

import { headers } from "next/headers";
import { listRecords } from "@/lib/airtable";
import { LINKED_RECORD_FIELDS } from "@/lib/linked-records";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { shouldSample, trackTelemetry } from "@/lib/telemetry";
import {
  getLinkedSearchCache,
  makeLinkedSearchCacheKey,
  runLinkedSearchWithInflight,
  setLinkedSearchCache,
  type CachedLinkedRecord,
} from "@/lib/linked-record-search-cache";

const ALLOWED_CONFIGS = new Map(
  Object.values(LINKED_RECORD_FIELDS).map((cfg) => [cfg.table, cfg])
);
const SEARCH_WINDOW_MS = 60_000;
const SEARCH_MAX_REQUESTS = envInt(process.env.SEARCH_RATE_LIMIT_MAX, 120);

export interface LinkedRecordSearchResult {
  records: Array<{ id: string; name: string; metadata?: Record<string, string> }>;
  error?: string;
}

export async function searchLinkedRecords(
  table: string,
  displayField: string,
  query: string,
  extraFields?: string[],
  sort?: { field: string; direction: "asc" | "desc" }
): Promise<LinkedRecordSearchResult> {
  const startedAt = Date.now();
  const sample = shouldSample();
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);

  const config = ALLOWED_CONFIGS.get(table);
  if (!config || config.displayField !== displayField) {
    if (sample) {
      trackTelemetry(
        "linked_search.invalid_config",
        { ip, table, displayField },
        "warn"
      );
    }
    return {
      records: [],
      error: "Linked record config is invalid. Please refresh and try again.",
    };
  }

  const allowedExtra = new Set(config.previewFields ?? []);
  if (extraFields) {
    for (const f of extraFields) {
      if (!allowedExtra.has(f)) {
        return {
          records: [],
          error: "Linked record field config is invalid. Please refresh and try again.",
        };
      }
    }
  }
  if (sort && sort.field !== config.sortField) {
    return {
      records: [],
      error: "Linked record sort config is invalid. Please refresh and try again.",
    };
  }

  const sanitized = query.replace(/["\\\n\r]/g, "");
  const filter = sanitized
    ? `SEARCH(LOWER("${sanitized}"), LOWER({${displayField}}))`
    : "";

  const allFields = [displayField, ...(extraFields ?? [])];
  const sortConfig = sort ?? (config.sortField
    ? { field: config.sortField, direction: config.sortDirection ?? "asc" }
    : undefined);

  const cacheKey = makeLinkedSearchCacheKey({
    table,
    displayField,
    query: sanitized,
    extraFields,
    sortField: sortConfig?.field,
    sortDirection: sortConfig?.direction,
  });

  const cached = await getLinkedSearchCache(cacheKey);
  if (cached) {
    if (sample) {
      trackTelemetry("linked_search.cache_hit", {
        ip,
        table,
        queryLength: query.length,
        count: cached.length,
        durationMs: Date.now() - startedAt,
      });
    }
    return { records: cached };
  }

  const limit = await checkRateLimit(`search-linked:${ip}`, {
    windowMs: SEARCH_WINDOW_MS,
    max: SEARCH_MAX_REQUESTS,
  });
  if (!limit.allowed) {
    if (sample) {
      trackTelemetry(
        "linked_search.rate_limited",
        { ip, retryAfterMs: limit.retryAfterMs },
        "warn"
      );
    }
    return {
      records: [],
      error: "Too many linked record searches. Please wait a moment and try again.",
    };
  }

  try {
    const records = await runLinkedSearchWithInflight(cacheKey, async () => {
      const airtableRecords = await listRecords(table, {
        fields: allFields,
        maxRecords: 50,
        filterFormula: filter || undefined,
        sort: sortConfig,
      });
      return airtableRecords.map((r): CachedLinkedRecord => {
        const metadata: Record<string, string> = {};
        if (extraFields) {
          for (const f of extraFields) {
            const val = r.fields[f];
            if (val != null) metadata[f] = String(val);
          }
        }
        return {
          id: r.id,
          name: (r.fields[displayField] as string) ?? "",
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        };
      });
    });

    await setLinkedSearchCache(cacheKey, sanitized, records);

    if (sample) {
      trackTelemetry("linked_search.success", {
        ip,
        table,
        queryLength: query.length,
        count: records.length,
        durationMs: Date.now() - startedAt,
      });
    }

    return { records };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (sample) {
      trackTelemetry(
        "linked_search.error",
        {
          ip,
          table,
          message,
          durationMs: Date.now() - startedAt,
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

function envInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}
