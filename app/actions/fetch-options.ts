"use server";

import { headers } from "next/headers";
import { listRecords } from "@/lib/airtable";
import { LINKED_RECORD_FIELDS } from "@/lib/linked-records";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { shouldSample, trackTelemetry } from "@/lib/telemetry";

const ALLOWED_CONFIGS = new Map(
  Object.values(LINKED_RECORD_FIELDS).map((cfg) => [cfg.table, cfg])
);
const SEARCH_WINDOW_MS = 60_000;
const SEARCH_MAX_REQUESTS = envInt(process.env.SEARCH_RATE_LIMIT_MAX, 120);

export async function searchLinkedRecords(
  table: string,
  displayField: string,
  query: string,
  extraFields?: string[],
  sort?: { field: string; direction: "asc" | "desc" }
): Promise<Array<{ id: string; name: string; metadata?: Record<string, string> }>> {
  const startedAt = Date.now();
  const sample = shouldSample();
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);
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
    throw new Error("Too many linked record searches. Please wait a moment and try again.");
  }

  const config = ALLOWED_CONFIGS.get(table);
  if (!config || config.displayField !== displayField) {
    if (sample) {
      trackTelemetry(
        "linked_search.invalid_config",
        { ip, table, displayField },
        "warn"
      );
    }
    throw new Error("Invalid table or display field");
  }

  const allowedExtra = new Set(config.previewFields ?? []);
  if (extraFields) {
    for (const f of extraFields) {
      if (!allowedExtra.has(f)) throw new Error("Invalid extra field");
    }
  }
  if (sort && sort.field !== config.sortField) {
    throw new Error("Invalid sort field");
  }

  const sanitized = query.replace(/["\\\n\r]/g, "");
  const filter = sanitized
    ? `SEARCH(LOWER("${sanitized}"), LOWER({${displayField}}))`
    : "";

  const allFields = [displayField, ...(extraFields ?? [])];

  try {
    const records = await listRecords(table, {
      fields: allFields,
      maxRecords: 50,
      filterFormula: filter || undefined,
      sort: sort,
    });

    if (sample) {
      trackTelemetry("linked_search.success", {
        ip,
        table,
        queryLength: query.length,
        count: records.length,
        durationMs: Date.now() - startedAt,
      });
    }

    return records.map((r) => {
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
  } catch (err) {
    if (sample) {
      trackTelemetry(
        "linked_search.error",
        {
          ip,
          table,
          message: err instanceof Error ? err.message : "Unknown error",
          durationMs: Date.now() - startedAt,
        },
        "error"
      );
    }
    throw err;
  }
}

function envInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}
