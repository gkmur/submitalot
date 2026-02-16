import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestOrigin } from "@/lib/request";
import { buildUploadUrl, persistUpload } from "@/lib/upload-storage";
import { shouldSample, trackTelemetry } from "@/lib/telemetry";

export const runtime = "nodejs";

const UPLOAD_WINDOW_MS = 60_000;
const UPLOAD_MAX_REQUESTS = envInt(process.env.UPLOAD_RATE_LIMIT_MAX, 60);
const MAX_UPLOAD_SIZE_BYTES = envInt(process.env.MAX_UPLOAD_SIZE_BYTES, 20 * 1024 * 1024);

export async function POST(request: Request) {
  const startedAt = Date.now();
  const sample = shouldSample();
  const ip = getClientIp(request.headers);
  const limit = await checkRateLimit(`upload:${ip}`, {
    windowMs: UPLOAD_WINDOW_MS,
    max: UPLOAD_MAX_REQUESTS,
  });

  if (!limit.allowed) {
    if (sample) {
      trackTelemetry(
        "upload.rate_limited",
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
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      if (sample) {
        trackTelemetry("upload.invalid_request", { ip, reason: "missing_file" }, "warn");
      }
      return NextResponse.json({ error: "Missing file upload" }, { status: 400 });
    }

    if (file.size <= 0) {
      if (sample) {
        trackTelemetry("upload.invalid_request", { ip, reason: "empty_file" }, "warn");
      }
      return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      if (sample) {
        trackTelemetry(
          "upload.invalid_request",
          { ip, reason: "file_too_large", fileSize: file.size, maxSize: MAX_UPLOAD_SIZE_BYTES },
          "warn"
        );
      }
      return NextResponse.json(
        { error: `File exceeds max upload size (${MAX_UPLOAD_SIZE_BYTES} bytes)` },
        { status: 413 }
      );
    }

    const stored = await persistUpload(file);
    const origin = getRequestOrigin(request.headers, request.url);

    if (sample) {
      trackTelemetry("upload.success", {
        ip,
        fileSize: file.size,
        durationMs: Date.now() - startedAt,
      });
    }

    return NextResponse.json({
      file: {
        id: stored.id,
        name: stored.originalName,
        type: stored.type,
        size: stored.size,
        url: buildUploadUrl(origin, stored.id),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    if (sample) {
      trackTelemetry(
        "upload.error",
        {
          ip,
          message,
          durationMs: Date.now() - startedAt,
        },
        "error"
      );
    }
    const clientError = process.env.NODE_ENV === "development" ? message : "Upload failed.";
    return NextResponse.json({ error: clientError }, { status: 500 });
  }
}

function envInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}
