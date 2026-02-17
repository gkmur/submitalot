import { NextRequest, NextResponse } from "next/server";
import { maybeRunAutoSchemaSync } from "@/lib/schema-sync-service";
import {
  isLinkedRecordFieldName,
  searchLinkedRecordsForField,
} from "@/lib/linked-record-search";

export async function GET(request: NextRequest) {
  try {
    void maybeRunAutoSchemaSync();

    const field = request.nextUrl.searchParams.get("field")?.trim() ?? "";
    const query = request.nextUrl.searchParams.get("query") ?? "";

    if (!field || !isLinkedRecordFieldName(field)) {
      return NextResponse.json(
        { records: [], error: "Invalid linked record field." },
        { status: 400 }
      );
    }

    const result = await searchLinkedRecordsForField(field, query, request.headers);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json(
      {
        records: [],
        error: "Unable to load linked records right now. Please try again.",
      },
      { status: 500 }
    );
  }
}

