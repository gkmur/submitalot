import "server-only";

import { fetchBaseSchema } from "./airtable-meta";
import {
  analyzeMappings,
  getInventoryTable,
  type FormFieldKey,
} from "./admin-sync";
import {
  applyRuntimeMappingUpdates,
  applyRuntimeOptionUpdates,
  getEffectiveFieldMap,
  getEffectiveOptionSets,
  getRuntimeAdminConfig,
  updateRuntimeAdminConfig,
} from "./runtime-admin-config";
import { buildOptionSyncDiff } from "./runtime-option-sync";

const AUTO_SYNC_ENABLED = process.env.ADMIN_AUTO_SYNC_ENABLED !== "false";
const AUTO_SYNC_INTERVAL_MS = envInt(
  process.env.ADMIN_AUTO_SYNC_INTERVAL_MINUTES,
  60
) * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var __submitalotAutoSchemaSyncPromise: Promise<void> | undefined;
  // eslint-disable-next-line no-var
  var __submitalotAutoSchemaSyncLastAttemptAt: number | undefined;
}

function envInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export interface SyncDiff {
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

export interface SyncApplyResult {
  updatedOptionsCount: number;
  mappingUpdatedCount: number;
  appliedMappings: Array<{ formKey: string; to: string }>;
  remainingUnmappedFields: Array<{ name: string; type: string }>;
  diff: SyncDiff;
  syncedAt: string;
}

export async function buildSyncPreview(): Promise<SyncDiff> {
  const schema = await fetchBaseSchema();
  const inventoryTable = getInventoryTable(schema);
  if (!inventoryTable) {
    throw new Error("Inventory table not found in base");
  }

  const currentMap = await getEffectiveFieldMap();
  const mappingAnalysis = analyzeMappings(inventoryTable, currentMap);
  const currentOptions = await getEffectiveOptionSets();
  const optionDiff = buildOptionSyncDiff(inventoryTable, currentOptions);

  const mappedAirtableNames = new Set(
    Object.values(currentMap)
      .filter((value): value is string => Boolean(value))
      .map((value) => value.trim())
  );

  const newFields = inventoryTable.fields
    .filter((field) => !mappedAirtableNames.has(field.name))
    .map((field) => field.name);

  return {
    newFields,
    updatedOptions: Object.fromEntries(
      Object.entries(optionDiff.updatedOptions).map(([key, value]) => [key, value])
    ),
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
}

export async function applySchemaSync(options?: {
  applySuggestedMappings?: boolean;
  mode?: "manual" | "auto";
}): Promise<SyncApplyResult> {
  const mode = options?.mode ?? "manual";
  const applySuggestedMappings = options?.applySuggestedMappings ?? true;

  const schema = await fetchBaseSchema();
  const inventoryTable = getInventoryTable(schema);
  if (!inventoryTable) {
    throw new Error("Inventory table not found in base");
  }

  const currentMap = await getEffectiveFieldMap();
  const mappingAnalysis = analyzeMappings(inventoryTable, currentMap);
  const currentOptions = await getEffectiveOptionSets();
  const optionDiff = buildOptionSyncDiff(inventoryTable, currentOptions);

  const mappingUpdates: Partial<Record<FormFieldKey, string>> = {};
  if (applySuggestedMappings) {
    for (const suggestion of mappingAnalysis.suggestions) {
      mappingUpdates[suggestion.formKey] = suggestion.suggestedField;
    }
  }

  const optionWrite = await applyRuntimeOptionUpdates(optionDiff.nextOptions);
  const mappingWrite = await applyRuntimeMappingUpdates(mappingUpdates);
  const nextMap = mappingWrite.nextMap;

  const mappedAirtableNames = new Set(
    Object.values(nextMap)
      .filter((value): value is string => Boolean(value))
      .map((value) => value.trim())
  );
  const remainingUnmappedFields = inventoryTable.fields
    .filter((field) => !mappedAirtableNames.has(field.name))
    .map((field) => ({ name: field.name, type: field.type }));

  const now = new Date().toISOString();
  await updateRuntimeAdminConfig((current) => ({
    ...current,
    updatedAt: now,
    lastManualSyncAt: mode === "manual" ? now : current.lastManualSyncAt,
    lastAutoSyncAt: mode === "auto" ? now : current.lastAutoSyncAt,
  }));

  return {
    updatedOptionsCount: optionWrite.changedCount,
    mappingUpdatedCount: mappingWrite.changedCount,
    appliedMappings: Object.entries(mappingUpdates).map(([formKey, to]) => ({
      formKey,
      to,
    })),
    remainingUnmappedFields,
    diff: await buildSyncPreview(),
    syncedAt: now,
  };
}

export async function maybeRunAutoSchemaSync() {
  if (!AUTO_SYNC_ENABLED) return;
  const now = Date.now();

  const runtime = await getRuntimeAdminConfig();
  const lastAutoSyncAt = runtime.lastAutoSyncAt
    ? Date.parse(runtime.lastAutoSyncAt)
    : 0;
  if (
    Number.isFinite(lastAutoSyncAt) &&
    lastAutoSyncAt > 0 &&
    Date.now() - lastAutoSyncAt < AUTO_SYNC_INTERVAL_MS
  ) {
    return;
  }

  if (
    globalThis.__submitalotAutoSchemaSyncLastAttemptAt &&
    now - globalThis.__submitalotAutoSchemaSyncLastAttemptAt < AUTO_SYNC_INTERVAL_MS
  ) {
    return;
  }

  if (globalThis.__submitalotAutoSchemaSyncPromise) {
    return;
  }

  globalThis.__submitalotAutoSchemaSyncLastAttemptAt = now;
  globalThis.__submitalotAutoSchemaSyncPromise = applySchemaSync({
    applySuggestedMappings: true,
    mode: "auto",
  })
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      globalThis.__submitalotAutoSchemaSyncPromise = undefined;
    });
}
