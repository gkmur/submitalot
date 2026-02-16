import { NextResponse } from "next/server";
import { z } from "zod";
import { itemizationSchema, type ItemizationSchemaType } from "@/lib/schema";
import { createRecord } from "@/lib/airtable";
import { AIRTABLE_FIELD_MAP } from "@/lib/constants/airtable";
import type { LinkedRecord } from "@/lib/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { getIdempotencyEntry, hashPayload, setIdempotencyEntry } from "@/lib/idempotency";
import { shouldSample, trackTelemetry } from "@/lib/telemetry";

export const runtime = "nodejs";

const SUBMIT_WINDOW_MS = 60_000;
const SUBMIT_MAX_REQUESTS = envInt(process.env.SUBMIT_RATE_LIMIT_MAX, 10);
const RECORD_ID_PATTERN = /^rec[a-zA-Z0-9]+$/;

const linkedRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  metadata: z.record(z.string()).optional(),
});

const linkedRecordsSchema = z.object({
  brandPartner: z.array(linkedRecordSchema).optional(),
  seller: z.array(linkedRecordSchema).optional(),
  restrictionsCompany: z.array(linkedRecordSchema).optional(),
});

const submitEnvelopeSchema = z.object({
  formData: itemizationSchema,
  linkedRecords: linkedRecordsSchema.optional(),
});

type LinkedRecordSelections = Partial<Record<"brandPartner" | "seller" | "restrictionsCompany", LinkedRecord[]>>;
type SubmitSuccess = { success: true; recordId: string };

export async function POST(request: Request) {
  const startedAt = Date.now();
  const sample = shouldSample();
  const ip = getClientIp(request.headers);
  const limit = await checkRateLimit(`submit:${ip}`, {
    windowMs: SUBMIT_WINDOW_MS,
    max: SUBMIT_MAX_REQUESTS,
  });
  if (!limit.allowed) {
    if (sample) {
      trackTelemetry(
        "submit.rate_limited",
        {
          ip,
          retryAfterMs: limit.retryAfterMs,
        },
        "warn"
      );
    }
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
        },
      }
    );
  }

  try {
    const idempotencyKey = normalizeIdempotencyKey(request.headers.get("idempotency-key"));
    const rawBody = await request.text();
    const payloadHash = hashPayload(rawBody);

    if (idempotencyKey) {
      const existing = await getIdempotencyEntry<SubmitSuccess>(idempotencyKey);
      if (existing) {
        if (existing.payloadHash !== payloadHash) {
          if (sample) {
            trackTelemetry(
              "submit.idempotency_conflict",
              {
                ip,
                durationMs: Date.now() - startedAt,
              },
              "warn"
            );
          }
          return NextResponse.json(
            { error: "Idempotency key reuse with different payload" },
            { status: 409 }
          );
        }

        if (sample) {
          trackTelemetry("submit.idempotency_replay", {
            ip,
            durationMs: Date.now() - startedAt,
          });
        }
        return NextResponse.json(existing.response, {
          status: existing.status,
          headers: {
            "Idempotent-Replayed": "true",
          },
        });
      }
    }

    const payload = safeJsonParse(rawBody);
    if (!payload.ok) {
      if (sample) {
        trackTelemetry("submit.invalid_json", { ip }, "warn");
      }
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }

    const parsed = parseSubmissionPayload(payload.value);

    if (!parsed.success) {
      if (sample) {
        trackTelemetry("submit.validation_failed", { ip }, "warn");
      }
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const fields = mapToAirtableFields(parsed.data.formData, parsed.data.linkedRecords);
    const record = await createRecord("Inventory", fields);
    const responsePayload: SubmitSuccess = { success: true, recordId: record.id };

    if (idempotencyKey) {
      await setIdempotencyEntry(idempotencyKey, payloadHash, responsePayload, 200);
    }

    if (sample) {
      trackTelemetry("submit.success", {
        ip,
        durationMs: Date.now() - startedAt,
      });
    }

    return NextResponse.json(responsePayload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (sample) {
      trackTelemetry(
        "submit.error",
        {
          ip,
          message,
          durationMs: Date.now() - startedAt,
        },
        "error"
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseSubmissionPayload(payload: unknown) {
  if (typeof payload === "object" && payload !== null && "formData" in payload) {
    return submitEnvelopeSchema.safeParse(payload);
  }

  const legacy = itemizationSchema.safeParse(payload);
  if (!legacy.success) {
    return legacy;
  }

  return {
    success: true as const,
    data: {
      formData: legacy.data,
      linkedRecords: undefined,
    },
  };
}

function safeJsonParse(rawBody: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(rawBody) };
  } catch {
    return { ok: false, error: "Invalid JSON payload" };
  }
}

function normalizeIdempotencyKey(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 128);
}

function envInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function isRecordId(value: unknown): value is string {
  return typeof value === "string" && RECORD_ID_PATTERN.test(value);
}

function mapToAirtableFields(
  data: ItemizationSchemaType,
  linkedRecords?: LinkedRecordSelections
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  for (const [formKey, airtableKey] of Object.entries(AIRTABLE_FIELD_MAP)) {
    if (!airtableKey) continue;

    const value = data[formKey as keyof ItemizationSchemaType];
    if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
      continue;
    }

    // Percentage fields: Airtable stores as decimal
    if (formKey === "marginTakeRate" || formKey === "maxPercentOffAsking") {
      fields[airtableKey] = (value as number) / 100;
      continue;
    }

    // File fields: Airtable expects [{url: "..."}]
    if (formKey === "inventoryFile" || formKey === "additionalFiles") {
      const fileArray = value as Array<{ url: string; name: string }>;
      if (fileArray.some((f) => !/^https?:\/\//i.test(f.url) || f.url.startsWith("blob:"))) {
        throw new Error("File upload URLs must be persisted server URLs");
      }
      fields[airtableKey] = fileArray.map((f) => ({ url: f.url, filename: f.name }));
      continue;
    }

    // Single linked fields: Airtable expects [recordId]
    if (formKey === "brandPartner" || formKey === "seller") {
      const fromSelections = linkedRecords?.[formKey]?.[0]?.id;
      const fromValue = isRecordId(value) ? value : null;
      const id = fromSelections ?? fromValue;
      if (!id) {
        throw new Error(`Missing linked record id for ${formKey}`);
      }
      fields[airtableKey] = [id];
      continue;
    }

    // Multi linked field: Airtable expects record ID array
    if (formKey === "restrictionsCompany") {
      const fromSelections = (linkedRecords?.restrictionsCompany ?? [])
        .map((r) => r.id)
        .filter(isRecordId);
      const fromValue = Array.isArray(value) ? value.filter(isRecordId) : [];
      const ids = fromSelections.length > 0 ? fromSelections : fromValue;
      if (ids.length > 0) {
        fields[airtableKey] = ids;
      }
      continue;
    }

    // Multi select passthrough
    if (
      formKey === "restrictionsBuyerType" ||
      formKey === "restrictionsRegion" ||
      formKey === "tagPresets"
    ) {
      fields[airtableKey] = value;
      continue;
    }

    fields[airtableKey] = value;
  }

  return fields;
}
