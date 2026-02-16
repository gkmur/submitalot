import { NextResponse } from "next/server";
import { loadUpload } from "@/lib/upload-storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const stored = loadUpload(id);
  if (!stored) {
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }

  const safeName = stored.meta.originalName.replace(/"/g, "");
  const bytes = new Uint8Array(stored.buffer.length);
  bytes.set(stored.buffer);
  const body = new Blob([bytes], {
    type: stored.meta.type || "application/octet-stream",
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": stored.meta.type || "application/octet-stream",
      "Content-Length": String(stored.meta.size),
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
