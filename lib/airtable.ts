import "server-only";

import { shouldSample, trackTelemetry } from "./telemetry";

const BASE_URL = "https://api.airtable.com/v0";
const REQUEST_TIMEOUT_MS = envInt(process.env.AIRTABLE_TIMEOUT_MS, 10000);
const LIST_MAX_ATTEMPTS = envInt(process.env.AIRTABLE_LIST_MAX_ATTEMPTS, 3);
const LIST_BASE_BACKOFF_MS = envInt(process.env.AIRTABLE_LIST_BASE_BACKOFF_MS, 250);

function getConfig() {
  const pat = process.env.AIRTABLE_PAT;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!pat || pat === "your_pat_here") throw new Error("AIRTABLE_PAT is not configured");
  if (!baseId) throw new Error("AIRTABLE_BASE_ID is not configured");
  return { pat, baseId };
}

function headers(pat: string) {
  return {
    Authorization: `Bearer ${pat}`,
    "Content-Type": "application/json",
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

function isRetryableFetchError(err: unknown) {
  if (!(err instanceof Error)) return false;
  return err.name === "AbortError" || err.name === "TypeError";
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.floor(seconds * 1000);
  }
  return null;
}

function envInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export async function createRecord(
  tableName: string,
  fields: Record<string, unknown>
): Promise<{ id: string }> {
  const startedAt = Date.now();
  const sample = shouldSample();
  const { pat, baseId } = getConfig();
  const res = await fetchWithTimeout(`${BASE_URL}/${baseId}/${encodeURIComponent(tableName)}`, {
    method: "POST",
    headers: headers(pat),
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    if (sample) {
      trackTelemetry(
        "airtable.create.error",
        {
          table: tableName,
          status: res.status,
          durationMs: Date.now() - startedAt,
        },
        "error"
      );
    }
    throw new Error(`Airtable create failed (${res.status}): ${JSON.stringify(error)}`);
  }

  const data = await res.json();
  if (sample) {
    trackTelemetry("airtable.create.success", {
      table: tableName,
      durationMs: Date.now() - startedAt,
    });
  }
  return { id: data.id };
}

export async function listRecords(
  tableName: string,
  options?: { fields?: string[]; maxRecords?: number; filterFormula?: string; sort?: { field: string; direction: "asc" | "desc" } }
): Promise<Array<{ id: string; fields: Record<string, unknown> }>> {
  const startedAt = Date.now();
  const sample = shouldSample();
  const { pat, baseId } = getConfig();
  const params = new URLSearchParams();
  if (options?.fields) options.fields.forEach(f => params.append("fields[]", f));
  if (options?.maxRecords) params.set("maxRecords", String(options.maxRecords));
  if (options?.filterFormula) params.set("filterByFormula", options.filterFormula);
  if (options?.sort) {
    params.set("sort[0][field]", options.sort.field);
    params.set("sort[0][direction]", options.sort.direction);
  }

  const url = `${BASE_URL}/${baseId}/${encodeURIComponent(tableName)}?${params}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < LIST_MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url, { headers: headers(pat), next: { revalidate: 300 } });

      if (res.ok) {
        const data = await res.json();
        if (sample) {
          trackTelemetry("airtable.list.success", {
            table: tableName,
            attempts: attempt + 1,
            count: Array.isArray(data.records) ? data.records.length : 0,
            durationMs: Date.now() - startedAt,
          });
        }
        return data.records;
      }

      if (isRetryableStatus(res.status) && attempt < LIST_MAX_ATTEMPTS - 1) {
        const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"));
        const backoff = retryAfterMs ?? LIST_BASE_BACKOFF_MS * (attempt + 1);
        if (sample) {
          trackTelemetry(
            "airtable.list.retry",
            {
              table: tableName,
              attempt: attempt + 1,
              status: res.status,
              backoffMs: backoff,
            },
            "warn"
          );
        }
        await sleep(backoff);
        continue;
      }

      const error = await res.json().catch(() => ({}));
      throw new Error(`Airtable list failed (${res.status}): ${JSON.stringify(error)}`);
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error("Unknown Airtable list error");
      lastError = wrapped;

      if (attempt < LIST_MAX_ATTEMPTS - 1 && isRetryableFetchError(err)) {
        if (sample) {
          trackTelemetry(
            "airtable.list.retry_error",
            {
              table: tableName,
              attempt: attempt + 1,
              message: wrapped.message,
            },
            "warn"
          );
        }
        await sleep(LIST_BASE_BACKOFF_MS * (attempt + 1));
        continue;
      }

      if (sample) {
        trackTelemetry(
          "airtable.list.error",
          {
            table: tableName,
            attempts: attempt + 1,
            message: wrapped.message,
            durationMs: Date.now() - startedAt,
          },
          "error"
        );
      }
      throw wrapped;
    }
  }

  if (sample) {
    trackTelemetry(
      "airtable.list.error",
      {
        table: tableName,
        attempts: LIST_MAX_ATTEMPTS,
        message: lastError?.message ?? "Airtable list failed after retries",
        durationMs: Date.now() - startedAt,
      },
      "error"
    );
  }
  throw lastError ?? new Error("Airtable list failed after retries");
}
