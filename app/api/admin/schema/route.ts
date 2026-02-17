import { NextResponse } from "next/server";
import { fetchBaseSchema } from "@/lib/airtable-meta";
import { requireAdminAccess } from "@/lib/admin-auth";
import { maybeRunAutoSchemaSync } from "@/lib/schema-sync-service";

export async function GET(request: Request) {
  const unauthorized = requireAdminAccess(request);
  if (unauthorized) return unauthorized;

  try {
    void maybeRunAutoSchemaSync();
    const schema = await fetchBaseSchema();
    return NextResponse.json(schema);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
