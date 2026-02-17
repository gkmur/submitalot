import { NextResponse } from "next/server";
import { getEffectiveOptionSets } from "@/lib/runtime-admin-config";
import { maybeRunAutoSchemaSync } from "@/lib/schema-sync-service";

export async function GET() {
  try {
    void maybeRunAutoSchemaSync();
    const options = await getEffectiveOptionSets();
    return NextResponse.json(
      { options, updatedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch {
    return NextResponse.json({ error: "Unable to load runtime options" }, { status: 500 });
  }
}
