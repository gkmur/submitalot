import { copyFileSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { fetchBaseSchema } from "@/lib/airtable-meta";
import {
  OPTIONS_PATH,
  analyzeMappings,
  applyMappingUpdates,
  getInventoryTable,
  readCurrentFieldMap,
  syncOptionsFromSchema,
} from "@/lib/admin-sync";
import type { FormFieldKey } from "@/lib/admin-sync";

interface SyncDiff {
  newFields: string[];
  updatedOptions: Record<string, { field: string; before: string[]; after: string[] }>;
  mappingIssues: Array<{
    formKey: string;
    mappedField: string | null;
    status: "ok" | "missing" | "read_only" | "empty";
    fieldType?: string;
    suggestedField?: string;
    suggestionReason?: string;
  }>;
  mappingSuggestions: Array<{
    formKey: string;
    from: string | null;
    to: string;
    reason: string;
  }>;
  timestamp: string;
}

interface SyncApplyRequestBody {
  applySuggestedMappings?: boolean;
}

function ensureAvailable() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  return null;
}

function readApplyBody(raw: unknown): SyncApplyRequestBody {
  if (!raw || typeof raw !== "object") return {};
  const body = raw as { applySuggestedMappings?: unknown };
  if (typeof body.applySuggestedMappings === "boolean") {
    return { applySuggestedMappings: body.applySuggestedMappings };
  }
  return {};
}

export async function POST() {
  const unavailable = ensureAvailable();
  if (unavailable) return unavailable;

  try {
    const schema = await fetchBaseSchema();
    const inventoryTable = getInventoryTable(schema);
    if (!inventoryTable) {
      return NextResponse.json({ error: "Inventory table not found in base" }, { status: 404 });
    }

    const optionsSource = readFileSync(OPTIONS_PATH, "utf-8");
    const currentMap = readCurrentFieldMap();
    const mappingAnalysis = analyzeMappings(inventoryTable, currentMap);
    const { updatedOptions } = syncOptionsFromSchema(optionsSource, inventoryTable);

    const mappedAirtableNames = new Set(
      Object.values(currentMap)
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim())
    );

    const newFields = inventoryTable.fields
      .filter((field) => !mappedAirtableNames.has(field.name))
      .map((field) => field.name);

    const diff: SyncDiff = {
      newFields,
      updatedOptions,
      mappingIssues: mappingAnalysis.issues.map((issue) => ({
        formKey: issue.formKey,
        mappedField: issue.mappedField,
        status: issue.status,
        fieldType: issue.fieldType,
        suggestedField: issue.suggestedField,
        suggestionReason: issue.suggestionReason,
      })),
      mappingSuggestions: mappingAnalysis.suggestions.map((suggestion) => ({
        formKey: suggestion.formKey,
        from: suggestion.mappedField,
        to: suggestion.suggestedField,
        reason: suggestion.suggestionReason,
      })),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({ diff, preview: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const unavailable = ensureAvailable();
  if (unavailable) return unavailable;

  try {
    const rawBody = await request.json().catch(() => ({}));
    const body = readApplyBody(rawBody);
    const applySuggestedMappings = body.applySuggestedMappings ?? true;

    const schema = await fetchBaseSchema();
    const inventoryTable = getInventoryTable(schema);
    if (!inventoryTable) {
      return NextResponse.json({ error: "Inventory table not found in base" }, { status: 404 });
    }

    const backupPaths: string[] = [];

    const optionsSource = readFileSync(OPTIONS_PATH, "utf-8");
    const optionSync = syncOptionsFromSchema(optionsSource, inventoryTable);
    if (optionSync.nextSource !== optionsSource) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const optionsBackupPath = `lib/constants.options.${timestamp}.bak.ts`;
      copyFileSync(OPTIONS_PATH, join(process.cwd(), optionsBackupPath));
      writeFileSync(OPTIONS_PATH, optionSync.nextSource, "utf-8");
      backupPaths.push(optionsBackupPath);
    }

    const currentMap = readCurrentFieldMap();
    const mappingAnalysis = analyzeMappings(inventoryTable, currentMap);

    const mappingUpdates: Partial<Record<FormFieldKey, string>> = {};
    if (applySuggestedMappings) {
      for (const suggestion of mappingAnalysis.suggestions) {
        mappingUpdates[suggestion.formKey] = suggestion.suggestedField;
      }
    }

    const mappingWrite = applyMappingUpdates(mappingUpdates);
    if (mappingWrite.backupPath) {
      backupPaths.push(mappingWrite.backupPath);
    }

    const nextMap = mappingWrite.nextMap;
    const mappedAirtableNames = new Set(
      Object.values(nextMap)
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim())
    );
    const remainingUnmappedFields = inventoryTable.fields.filter(
      (field) => !mappedAirtableNames.has(field.name)
    );

    return NextResponse.json({
      success: true,
      backupPath: backupPaths,
      updatedOptionsCount: Object.keys(optionSync.updatedOptions).length,
      mappingUpdatedCount: mappingWrite.changedCount,
      appliedMappings: Object.entries(mappingUpdates).map(([formKey, to]) => ({
        formKey,
        to,
      })),
      remainingUnmappedFields: remainingUnmappedFields.map((field) => ({
        name: field.name,
        type: field.type,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
