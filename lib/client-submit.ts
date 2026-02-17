import type { ItemizationFormData, LinkedRecord } from "./types";
import type { LinkedRecordFieldName } from "./storage";

export interface SubmitSuccessPayload {
  success: true;
  recordId: string;
}

export interface SubmitEnvelopePayload {
  formData: ItemizationFormData;
  linkedRecords: Partial<Record<LinkedRecordFieldName, LinkedRecord[]>>;
}

export class SubmitRequestError extends Error {
  status?: number;
  retryAfterMs?: number;

  constructor(message: string, details?: { status?: number; retryAfterMs?: number }) {
    super(message);
    this.name = "SubmitRequestError";
    this.status = details?.status;
    this.retryAfterMs = details?.retryAfterMs;
  }
}

const SUBMIT_TIMEOUT_MS = envInt(process.env.NEXT_PUBLIC_SUBMIT_TIMEOUT_MS, 20_000);
const SUBMIT_MAX_ATTEMPTS = envInt(process.env.NEXT_PUBLIC_SUBMIT_MAX_ATTEMPTS, 3);
const SUBMIT_BASE_BACKOFF_MS = envInt(process.env.NEXT_PUBLIC_SUBMIT_BASE_BACKOFF_MS, 350);
const SUBMIT_MAX_BACKOFF_MS = envInt(process.env.NEXT_PUBLIC_SUBMIT_MAX_BACKOFF_MS, 4_000);

function envInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withJitter(ms: number) {
  return ms + Math.floor(Math.random() * 120);
}

function nextBackoffMs(attempt: number) {
  const exponential = SUBMIT_BASE_BACKOFF_MS * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(SUBMIT_MAX_BACKOFF_MS, withJitter(exponential));
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.floor(seconds * 1000);
  }

  const asDate = Date.parse(value);
  if (Number.isFinite(asDate)) {
    return Math.max(0, asDate - Date.now());
  }

  return null;
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function isRetryableFetchError(err: unknown) {
  if (!(err instanceof Error)) return false;
  if (err.name === "AbortError") return true;
  return /network|fetch|failed to fetch|timed out|timeout/i.test(err.message);
}

async function fetchAttempt(
  payload: SubmitEnvelopePayload,
  idempotencyKey: string
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

  try {
    return await fetch("/api/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new SubmitRequestError(
        `Submission request timed out after ${Math.ceil(SUBMIT_TIMEOUT_MS / 1000)}s.`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function submitWithRetry(
  payload: SubmitEnvelopePayload,
  idempotencyKey: string
): Promise<SubmitSuccessPayload> {
  let lastError: SubmitRequestError | null = null;

  for (let attempt = 1; attempt <= SUBMIT_MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetchAttempt(payload, idempotencyKey);
      const body = await res.json().catch(() => ({}));

      if (res.ok) {
        return body as SubmitSuccessPayload;
      }

      const retryAfterMs = parseRetryAfterMs(res.headers.get("Retry-After"));
      const message =
        typeof body.error === "string" && body.error
          ? body.error
          : `Submission failed (${res.status})`;

      const responseError = new SubmitRequestError(message, {
        status: res.status,
        retryAfterMs: retryAfterMs ?? undefined,
      });

      if (attempt < SUBMIT_MAX_ATTEMPTS && isRetryableStatus(res.status)) {
        const delay = retryAfterMs ?? nextBackoffMs(attempt);
        await sleep(delay);
        continue;
      }

      if (res.status === 429 && retryAfterMs) {
        throw new SubmitRequestError(
          `Too many requests. Please retry in ${Math.ceil(retryAfterMs / 1000)}s.`,
          { status: res.status, retryAfterMs }
        );
      }

      throw responseError;
    } catch (err) {
      if (err instanceof SubmitRequestError) {
        lastError = err;
        if (
          attempt < SUBMIT_MAX_ATTEMPTS &&
          (isRetryableStatus(err.status ?? 0) || isRetryableFetchError(err))
        ) {
          await sleep(nextBackoffMs(attempt));
          continue;
        }
        throw err;
      }

      const wrapped = new SubmitRequestError(
        err instanceof Error ? err.message : "Submission failed. Please try again."
      );
      lastError = wrapped;

      if (attempt < SUBMIT_MAX_ATTEMPTS && isRetryableFetchError(err)) {
        await sleep(nextBackoffMs(attempt));
        continue;
      }

      throw wrapped;
    }
  }

  throw lastError ?? new SubmitRequestError("Submission failed. Please try again.");
}
