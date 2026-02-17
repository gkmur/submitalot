import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin-auth";
import {
  applySchemaSync,
  buildSyncPreview,
  maybeRunAutoSchemaSync,
} from "@/lib/schema-sync-service";

interface SyncApplyRequestBody {
  applySuggestedMappings?: boolean;
}

function readApplyBody(raw: unknown): SyncApplyRequestBody {
  if (!raw || typeof raw !== "object") return {};
  const body = raw as { applySuggestedMappings?: unknown };
  if (typeof body.applySuggestedMappings === "boolean") {
    return { applySuggestedMappings: body.applySuggestedMappings };
  }
  return {};
}

export async function POST(request: Request) {
  const unauthorized = requireAdminAccess(request);
  if (unauthorized) return unauthorized;

  try {
    void maybeRunAutoSchemaSync();
    const diff = await buildSyncPreview();
    return NextResponse.json({ diff, preview: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const unauthorized = requireAdminAccess(request);
  if (unauthorized) return unauthorized;

  try {
    const rawBody = await request.json().catch(() => ({}));
    const body = readApplyBody(rawBody);
    const applySuggestedMappings = body.applySuggestedMappings ?? true;
    const result = await applySchemaSync({
      applySuggestedMappings,
      mode: "manual",
    });

    return NextResponse.json({
      success: true,
      backupPath: [],
      updatedOptionsCount: result.updatedOptionsCount,
      mappingUpdatedCount: result.mappingUpdatedCount,
      appliedMappings: result.appliedMappings,
      remainingUnmappedFields: result.remainingUnmappedFields,
      syncedAt: result.syncedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
