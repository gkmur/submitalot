import { NextResponse } from "next/server";
import { fetchBaseSchema } from "@/lib/airtable-meta";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    const schema = await fetchBaseSchema();
    return NextResponse.json(schema);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
