import { NextResponse } from "next/server";
import { itemizationSchema, type ItemizationSchemaType } from "@/lib/schema";
import { createRecord } from "@/lib/airtable";
import { AIRTABLE_FIELD_MAP } from "@/lib/constants";
import type { ItemizationFormData } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = itemizationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const fields = mapToAirtableFields(parsed.data);
    const record = await createRecord("Inventory", fields);

    return NextResponse.json({ success: true, recordId: record.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function mapToAirtableFields(data: ItemizationSchemaType): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  for (const [formKey, airtableKey] of Object.entries(AIRTABLE_FIELD_MAP)) {
    const value = data[formKey as keyof ItemizationSchemaType];
    if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
      continue;
    }

    // Percentage fields: Airtable stores as decimal
    if (formKey === "marginTakeRate" || formKey === "maxPercentOffAsking") {
      fields[airtableKey] = (value as number) / 100;
      continue;
    }

    // File fields: Airtable expects [{url: "..."}]
    if (formKey === "inventoryFile" || formKey === "additionalFiles") {
      const fileArray = value as Array<{ url: string; name: string }>;
      fields[airtableKey] = fileArray.map((f) => ({ url: f.url, filename: f.name }));
      continue;
    }

    // Linked record arrays (restrictions): Airtable expects record IDs
    if (
      formKey === "restrictionsCompany" ||
      formKey === "restrictionsBuyerType" ||
      formKey === "restrictionsRegion" ||
      formKey === "tagPresets"
    ) {
      // For now these are string arrays — will be linked record IDs in Phase 4
      fields[airtableKey] = value;
      continue;
    }

    fields[airtableKey] = value;
  }

  return fields;
}
