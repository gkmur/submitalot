import { NextResponse } from "next/server";
import { applySchemaSync } from "@/lib/schema-sync-service";

function hasValidCronSecret(request: Request) {
  const expected = process.env.ADMIN_SYNC_CRON_SECRET?.trim();
  if (!expected) return false;

  const provided =
    request.headers.get("x-cron-secret")?.trim() ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";
  return provided === expected;
}

export async function POST(request: Request) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await applySchemaSync({
      applySuggestedMappings: true,
      mode: "auto",
    });

    return NextResponse.json({
      success: true,
      syncedAt: result.syncedAt,
      updatedOptionsCount: result.updatedOptionsCount,
      mappingUpdatedCount: result.mappingUpdatedCount,
      remainingUnmappedFields: result.remainingUnmappedFields,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
