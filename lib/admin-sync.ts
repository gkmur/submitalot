import { copyFileSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type {
  AirtableBaseSchema,
  AirtableFieldSchema,
  AirtableTableSchema,
} from "./airtable-meta";
import { getFieldChoices } from "./airtable-meta";
import { AIRTABLE_FIELD_MAP } from "./constants/airtable";
import type { ItemizationFormData } from "./types";

export const OPTIONS_PATH = join(process.cwd(), "lib/constants/options.ts");
export const AIRTABLE_MAP_PATH = join(process.cwd(), "lib/constants/airtable.ts");

export type FormFieldKey = keyof ItemizationFormData;

export interface MappingRow {
  formKey: FormFieldKey;
  mappedField: string | null;
  status: "ok" | "missing" | "read_only" | "empty";
  fieldType?: string;
  suggestedField?: string;
  suggestionReason?: string;
}

export interface MappingAnalysis {
  rows: MappingRow[];
  issues: MappingRow[];
  suggestions: Array<Required<Pick<MappingRow, "formKey" | "mappedField" | "suggestedField" | "suggestionReason">>>;
}

export interface MappingWriteResult {
  backupPath: string | null;
  changedCount: number;
  nextMap: Partial<Record<FormFieldKey, string>>;
}

export interface OptionArrayDiff {
  field: string;
  before: string[];
  after: string[];
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

const OPTION_SYNC_FIELDS: Record<string, string> = {
  "Restrictions (Buyer Type)": "BUYER_TYPE_OPTIONS",
  "Tag Presets": "TAG_PRESET_OPTIONS",
  "Tag presets": "TAG_PRESET_OPTIONS",
  "Restrictions (Region)": "COUNTRY_OPTIONS",
};

const MAPPING_ALIAS_CANDIDATES: Record<string, string[]> = {
  "Product Assortment": ["Assortment Strength"],
  "Inventory Condition": ["Inventory Quality"],
  "Overall Listing Rating": ["Overall Rating"],
  "WH Brand Demand": ["WH Demand", "SP Brand Demand"],
  "SP Location": ["SP US Landed", "Location"],
  "WH Location": ["WH US Landed", "Location"],
  "Inventory Exclusivity": ["Exclusivity"],
  "Tag presets": ["Tag Presets"],
  "All tags": ["Tags"],
  "Lead Time Number": ["Lead Time"],
  "Does this lot incur inland freight?": ["Lot Inland Freight"],
  "Margin % (Take Rate)": ["Margin (Take Rate)"],
  "Increase or decrease?": ["Reference Column Calculation"],
  "Max Percent Off Asking": ["Minimum Acceptable Offer"],
  "Listing disaggregation": ["Listing Disaggregation Options"],
  "Custom disaggregation": ["Listing Disaggregation Notes"],
  "Stealth?": ["Stealth"],
  "P0 Fire Listing?": ["WH - P0 Fire Listing"],
  "City": ["City (string)"],
  "Minimum Order": ["Minimum Order (String)"],
};

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(value: string) {
  const tokens = normalizeName(value).split(/\s+/).filter(Boolean);
  return new Set(tokens);
}

function overlapScore(a: string, b: string) {
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);
  if (aTokens.size === 0 && bTokens.size === 0) return 1;

  let shared = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) shared += 1;
  }
  const union = new Set([...aTokens, ...bTokens]).size;
  return union === 0 ? 0 : shared / union;
}

function isWritableFieldType(type: string) {
  return !READ_ONLY_FIELD_TYPES.has(type);
}

function findFieldCaseInsensitive(
  fields: AirtableFieldSchema[],
  fieldName: string
): AirtableFieldSchema | undefined {
  const target = fieldName.toLowerCase();
  return fields.find((f) => f.name.toLowerCase() === target);
}

function findFieldNormalized(
  fields: AirtableFieldSchema[],
  fieldName: string
): AirtableFieldSchema | undefined {
  const target = normalizeName(fieldName);
  return fields.find((f) => normalizeName(f.name) === target);
}

function suggestByScore(
  fields: AirtableFieldSchema[],
  fieldName: string
): AirtableFieldSchema | undefined {
  const ranked = fields
    .map((field) => ({ field, score: overlapScore(fieldName, field.name) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const second = ranked[1];
  if (!best) return undefined;

  const isClearlyBetter = !second || best.score - second.score >= 0.18;
  if (best.score >= 0.72 && isClearlyBetter) return best.field;
  return undefined;
}

function suggestReplacement(
  mappedField: string,
  fields: AirtableFieldSchema[]
): { field: AirtableFieldSchema; reason: string } | null {
  const aliasCandidates = MAPPING_ALIAS_CANDIDATES[mappedField];
  if (aliasCandidates) {
    for (const candidate of aliasCandidates) {
      const found = fields.find((f) => f.name === candidate);
      if (found && isWritableFieldType(found.type)) {
        return { field: found, reason: "known rename" };
      }
    }
  }

  const caseInsensitive = findFieldCaseInsensitive(fields, mappedField);
  if (caseInsensitive && isWritableFieldType(caseInsensitive.type)) {
    return { field: caseInsensitive, reason: "case-insensitive name match" };
  }

  const normalized = findFieldNormalized(fields, mappedField);
  if (normalized && isWritableFieldType(normalized.type)) {
    return { field: normalized, reason: "normalized name match" };
  }

  const scored = suggestByScore(fields, mappedField);
  if (scored && isWritableFieldType(scored.type)) {
    return { field: scored, reason: "best fuzzy name match" };
  }

  return null;
}

function parseMapEntries(mapBody: string) {
  const entries = new Map<string, string>();
  const lineRegex = /^\s*([a-zA-Z0-9_]+):\s*"([^"]*)",?\s*$/gm;
  for (const match of mapBody.matchAll(lineRegex)) {
    const key = match[1];
    const value = match[2];
    entries.set(key, value);
  }
  return entries;
}

function parseMapFromSource(source: string) {
  const blockMatch = source.match(
    /export const AIRTABLE_FIELD_MAP:[\s\S]*?=\s*\{([\s\S]*?)\n\};/
  );
  if (!blockMatch) {
    throw new Error("Unable to parse AIRTABLE_FIELD_MAP block");
  }
  return parseMapEntries(blockMatch[1]);
}

function serializeMapEntries(entries: Array<[string, string]>) {
  return entries
    .map(([key, value]) => `  ${key}: "${value}",`)
    .join("\n");
}

export function getInventoryTable(schema: AirtableBaseSchema): AirtableTableSchema | null {
  return (
    schema.tables.find((t) => t.name === "Inventory") ??
    schema.tables.find((t) => t.name.toLowerCase().includes("inventory")) ??
    null
  );
}

export function analyzeMappings(
  inventoryTable: AirtableTableSchema,
  currentMap: Partial<Record<FormFieldKey, string>>
): MappingAnalysis {
  const fieldsByName = new Map(inventoryTable.fields.map((f) => [f.name, f]));
  const rows: MappingRow[] = [];
  const suggestions: MappingAnalysis["suggestions"] = [];

  for (const [formKey, mapped] of Object.entries(currentMap) as Array<[FormFieldKey, string | undefined]>) {
    const mappedField = mapped?.trim() || null;
    if (!mappedField) {
      rows.push({ formKey, mappedField: null, status: "empty" });
      continue;
    }

    const exact = fieldsByName.get(mappedField);
    if (!exact) {
      const suggested = suggestReplacement(mappedField, inventoryTable.fields);
      const row: MappingRow = {
        formKey,
        mappedField,
        status: "missing",
        suggestedField: suggested?.field.name,
        suggestionReason: suggested?.reason,
      };
      rows.push(row);
      if (suggested) {
        suggestions.push({
          formKey,
          mappedField,
          suggestedField: suggested.field.name,
          suggestionReason: suggested.reason,
        });
      }
      continue;
    }

    if (!isWritableFieldType(exact.type)) {
      const suggested = suggestReplacement(mappedField, inventoryTable.fields);
      const row: MappingRow = {
        formKey,
        mappedField,
        status: "read_only",
        fieldType: exact.type,
        suggestedField: suggested?.field.name,
        suggestionReason: suggested?.reason,
      };
      rows.push(row);
      if (suggested) {
        suggestions.push({
          formKey,
          mappedField,
          suggestedField: suggested.field.name,
          suggestionReason: suggested.reason,
        });
      }
      continue;
    }

    rows.push({
      formKey,
      mappedField,
      status: "ok",
      fieldType: exact.type,
    });
  }

  const issues = rows.filter((row) => row.status === "missing" || row.status === "read_only");
  return { rows, issues, suggestions };
}

export function readCurrentFieldMap() {
  const source = readFileSync(AIRTABLE_MAP_PATH, "utf-8");
  const parsedEntries = parseMapFromSource(source);
  const map = {} as Partial<Record<FormFieldKey, string>>;

  for (const formKey of Object.keys(AIRTABLE_FIELD_MAP) as FormFieldKey[]) {
    const value = parsedEntries.get(formKey);
    if (value) {
      map[formKey] = value;
      continue;
    }

    const fallback = AIRTABLE_FIELD_MAP[formKey];
    if (fallback) map[formKey] = fallback;
  }

  return map;
}

export function applyMappingUpdates(
  updates: Partial<Record<FormFieldKey, string>>
): MappingWriteResult {
  const source = readFileSync(AIRTABLE_MAP_PATH, "utf-8");
  const originalEntries = parseMapFromSource(source);

  let changedCount = 0;
  for (const [formKey, nextValue] of Object.entries(updates) as Array<[FormFieldKey, string | undefined]>) {
    if (typeof nextValue !== "string") continue;
    const trimmed = nextValue.trim();
    if (!trimmed) continue;

    const current = originalEntries.get(formKey);
    if (current !== trimmed) {
      originalEntries.set(formKey, trimmed);
      changedCount += 1;
    }
  }

  let backupPath: string | null = null;
  if (changedCount > 0) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    backupPath = `lib/constants.airtable.${timestamp}.bak.ts`;
    copyFileSync(AIRTABLE_MAP_PATH, join(process.cwd(), backupPath));
  }

  const orderedKeys = Object.keys(AIRTABLE_FIELD_MAP) as FormFieldKey[];
  const entries: Array<[string, string]> = [];
  for (const formKey of orderedKeys) {
    const value = originalEntries.get(formKey) ?? AIRTABLE_FIELD_MAP[formKey];
    if (value) entries.push([formKey, value]);
  }

  const body = serializeMapEntries(entries);
  const nextSource = source.replace(
    /export const AIRTABLE_FIELD_MAP:[\s\S]*?=\s*\{[\s\S]*?\n\};/,
    `export const AIRTABLE_FIELD_MAP: Partial<Record<keyof ItemizationFormData, string>> = {\n${body}\n};`
  );
  if (changedCount > 0) {
    writeFileSync(AIRTABLE_MAP_PATH, nextSource, "utf-8");
  }

  const nextMap = {} as Partial<Record<FormFieldKey, string>>;
  for (const [key, value] of entries) {
    nextMap[key as FormFieldKey] = value;
  }

  return { backupPath, changedCount, nextMap };
}

function parseStringArrayFromConstant(source: string, constantName: string) {
  const match = source.match(new RegExp(`export const ${constantName}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  if (!match) return [];
  return match[1]
    .split(",")
    .map((segment) => segment.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

export function syncOptionsFromSchema(
  source: string,
  inventoryTable: AirtableTableSchema
): { nextSource: string; updatedOptions: Record<string, OptionArrayDiff> } {
  let nextSource = source;
  const updatedOptions: Record<string, OptionArrayDiff> = {};

  for (const field of inventoryTable.fields) {
    const constantName = OPTION_SYNC_FIELDS[field.name];
    if (!constantName) continue;

    const choices = getFieldChoices(field);
    if (choices.length === 0) continue;

    const nextOptions = choices.map((choice) => choice.name);
    const currentOptions = parseStringArrayFromConstant(nextSource, constantName);
    const hasChanged =
      nextOptions.length !== currentOptions.length ||
      nextOptions.some((option, index) => option !== currentOptions[index]);

    if (!hasChanged) continue;

    const choiceLines = nextOptions.map((option) => `  "${option}"`).join(",\n");
    const replacement = `export const ${constantName} = [\n${choiceLines},\n];`;
    const targetRegex = new RegExp(`export const ${constantName}\\s*=\\s*\\[[\\s\\S]*?\\];`);
    nextSource = nextSource.replace(targetRegex, replacement);
    updatedOptions[constantName] = {
      field: field.name,
      before: currentOptions,
      after: nextOptions,
    };
  }

  return { nextSource, updatedOptions };
}
