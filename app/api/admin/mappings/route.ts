import { NextResponse } from "next/server";
import { fetchBaseSchema } from "@/lib/airtable-meta";
import { analyzeMappings, getInventoryTable } from "@/lib/admin-sync";
import type { FormFieldKey } from "@/lib/admin-sync";
import { requireAdminAccess } from "@/lib/admin-auth";
import { getEffectiveFieldMap, applyRuntimeMappingUpdates } from "@/lib/runtime-admin-config";
import { maybeRunAutoSchemaSync } from "@/lib/schema-sync-service";

interface MappingUpdateRequestBody {
  updates?: Partial<Record<FormFieldKey, string>>;
  applySuggestions?: boolean;
}

const READ_ONLY_FIELD_TYPES = new Set([
  "formula",
  "rollup",
  "count",
  "lookup",
  "multipleLookupValues",
  "button",
  "createdBy",
  "createdTime",
  "lastModifiedBy",
  "lastModifiedTime",
  "autoNumber",
]);

function isWritableFieldType(type: string) {
  return !READ_ONLY_FIELD_TYPES.has(type);
}

function parseRequestBody(raw: unknown): MappingUpdateRequestBody {
  if (!raw || typeof raw !== "object") return {};
  const body = raw as {
    updates?: unknown;
    applySuggestions?: unknown;
  };

  const parsed: MappingUpdateRequestBody = {};
  if (typeof body.applySuggestions === "boolean") {
    parsed.applySuggestions = body.applySuggestions;
  }
  if (body.updates && typeof body.updates === "object") {
    parsed.updates = body.updates as Partial<Record<FormFieldKey, string>>;
  }
  return parsed;
}

export async function GET(request: Request) {
  const unauthorized = requireAdminAccess(request);
  if (unauthorized) return unauthorized;

  try {
    void maybeRunAutoSchemaSync();
    const schema = await fetchBaseSchema();
    const inventoryTable = getInventoryTable(schema);
    if (!inventoryTable) {
      return NextResponse.json({ error: "Inventory table not found in base" }, { status: 404 });
    }

    const currentMap = await getEffectiveFieldMap();
    const analysis = analyzeMappings(inventoryTable, currentMap);

    return NextResponse.json({
      table: {
        id: inventoryTable.id,
        name: inventoryTable.name,
      },
      fields: inventoryTable.fields.map((field) => ({
        name: field.name,
        type: field.type,
        writable: isWritableFieldType(field.type),
      })),
      currentMap,
      rows: analysis.rows,
      issuesCount: analysis.issues.length,
      suggestionCount: analysis.suggestions.length,
    });
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
    const body = parseRequestBody(rawBody);

    const schema = await fetchBaseSchema();
    const inventoryTable = getInventoryTable(schema);
    if (!inventoryTable) {
      return NextResponse.json({ error: "Inventory table not found in base" }, { status: 404 });
    }

    const currentMap = await getEffectiveFieldMap();
    const currentAnalysis = analyzeMappings(inventoryTable, currentMap);
    const fieldByName = new Map(inventoryTable.fields.map((field) => [field.name, field]));

    const updates: Partial<Record<FormFieldKey, string>> = {};
    if (body.applySuggestions) {
      for (const suggestion of currentAnalysis.suggestions) {
        updates[suggestion.formKey] = suggestion.suggestedField;
      }
    }

    if (body.updates) {
      const allowedFormKeys = new Set(Object.keys(currentMap));
      for (const [formKey, nextFieldRaw] of Object.entries(body.updates) as Array<
        [FormFieldKey, string | undefined]
      >) {
        if (!allowedFormKeys.has(formKey)) {
          return NextResponse.json({ error: `Invalid form key: ${formKey}` }, { status: 400 });
        }
        if (typeof nextFieldRaw !== "string") {
          return NextResponse.json({ error: `Invalid field for ${formKey}` }, { status: 400 });
        }

        const nextField = nextFieldRaw.trim();
        if (!nextField) {
          return NextResponse.json(
            { error: `Mapping for ${formKey} cannot be empty` },
            { status: 400 }
          );
        }

        const schemaField = fieldByName.get(nextField);
        if (!schemaField) {
          return NextResponse.json(
            { error: `Airtable field does not exist: ${nextField}` },
            { status: 400 }
          );
        }
        if (!isWritableFieldType(schemaField.type)) {
          return NextResponse.json(
            { error: `Airtable field is read-only: ${nextField} (${schemaField.type})` },
            { status: 400 }
          );
        }

        updates[formKey] = nextField;
      }
    }

    const writeResult = await applyRuntimeMappingUpdates(updates);
    const nextAnalysis = analyzeMappings(inventoryTable, writeResult.nextMap);

    return NextResponse.json({
      success: true,
      backupPath: null,
      changedCount: writeResult.changedCount,
      currentMap: writeResult.nextMap,
      rows: nextAnalysis.rows,
      issuesCount: nextAnalysis.issues.length,
      suggestionCount: nextAnalysis.suggestions.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
