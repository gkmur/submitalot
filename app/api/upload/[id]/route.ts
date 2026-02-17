import { NextResponse } from "next/server";
import { loadUpload } from "@/lib/upload-storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const stored = await loadUpload(id);
  if (!stored) {
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }

  const safeName = sanitizeFilename(stored.meta.originalName);
  const encodedName = encodeRFC5987ValueChars(safeName);
  const bytes = new Uint8Array(stored.buffer.length);
  bytes.set(stored.buffer);
  const body = new Blob([bytes], { type: "application/octet-stream" });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(stored.buffer.length),
      "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

function sanitizeFilename(value: string) {
  const normalized = value.replace(/[\r\n"]/g, "").trim();
  return normalized || "upload.bin";
}

function encodeRFC5987ValueChars(value: string) {
  return encodeURIComponent(value).replace(/['()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}
