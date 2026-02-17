import "server-only";

import { getFieldChoices, type AirtableTableSchema } from "./airtable-meta";
import type { OptionArrayDiff } from "./admin-sync";
import type { RuntimeOptionName, RuntimeOptionSets } from "./runtime-option-types";

export const OPTION_SYNC_FIELDS: Record<string, RuntimeOptionName> = {
  "Restrictions (Buyer Type)": "BUYER_TYPE_OPTIONS",
  "Tag Presets": "TAG_PRESET_OPTIONS",
  "Tag presets": "TAG_PRESET_OPTIONS",
  "Restrictions (Region)": "COUNTRY_OPTIONS",
};

function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function buildOptionSyncDiff(
  inventoryTable: AirtableTableSchema,
  currentOptions: RuntimeOptionSets
): {
  updatedOptions: Partial<Record<RuntimeOptionName, OptionArrayDiff>>;
  nextOptions: Partial<RuntimeOptionSets>;
} {
  const updatedOptions: Partial<Record<RuntimeOptionName, OptionArrayDiff>> = {};
  const nextOptions: Partial<RuntimeOptionSets> = {};

  for (const field of inventoryTable.fields) {
    const optionName = OPTION_SYNC_FIELDS[field.name];
    if (!optionName) continue;

    const choices = getFieldChoices(field);
    if (choices.length === 0) continue;

    const next = choices.map((choice) => choice.name.trim()).filter(Boolean);
    const before = currentOptions[optionName] ?? [];

    if (arraysEqual(before, next)) continue;

    updatedOptions[optionName] = {
      field: field.name,
      before,
      after: next,
    };
    nextOptions[optionName] = next;
  }

  return { updatedOptions, nextOptions };
}
