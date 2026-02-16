import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { join } from "path";
import { fetchBaseSchema, getFieldChoices } from "@/lib/airtable-meta";
import { AIRTABLE_FIELD_MAP } from "@/lib/constants/airtable";
import type { ItemizationFormData } from "@/lib/types";

const OPTIONS_PATH = join(process.cwd(), "lib/constants/options.ts");
const AIRTABLE_MAP_PATH = join(process.cwd(), "lib/constants/airtable.ts");

interface SyncDiff {
  newFields: string[];
  updatedOptions: Record<string, { field: string; before: string[]; after: string[] }>;
  timestamp: string;
}

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    const schema = await fetchBaseSchema();
    const inventoryTable = schema.tables.find(
      (t) => t.name === "Inventory" || t.name.toLowerCase().includes("inventory")
    );

    if (!inventoryTable) {
      return NextResponse.json({ error: "Inventory table not found in base" }, { status: 404 });
    }

    const existingSource = readFileSync(OPTIONS_PATH, "utf-8");

    // Build the set of already-mapped Airtable field names
    const mappedAirtableNames = new Set(Object.values(AIRTABLE_FIELD_MAP));

    // Find new fields in Airtable that aren't mapped
    const newFields: string[] = [];
    for (const field of inventoryTable.fields) {
      if (!mappedAirtableNames.has(field.name)) {
        newFields.push(field.name);
      }
    }

    // Check select/multiselect fields for option changes
    const optionArrays: Record<string, { constant: string; fieldName: string }> = {
      "Restrictions (Buyer Type)": { constant: "BUYER_TYPE_OPTIONS", fieldName: "Restrictions (Buyer Type)" },
      "Tag presets": { constant: "TAG_PRESET_OPTIONS", fieldName: "Tag presets" },
      "Restrictions (Region)": { constant: "COUNTRY_OPTIONS", fieldName: "Restrictions (Region)" },
    };

    const updatedOptions: SyncDiff["updatedOptions"] = {};

    for (const field of inventoryTable.fields) {
      const mapping = optionArrays[field.name];
      if (!mapping) continue;

      const choices = getFieldChoices(field);
      if (choices.length === 0) continue;

      const choiceNames = choices.map((c) => c.name);
      const currentMatch = existingSource.match(
        new RegExp(`export const ${mapping.constant}\\s*=\\s*\\[([\\s\\S]*?)\\];`)
      );

      if (currentMatch) {
        const currentOptions = currentMatch[1]
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);

        const hasChanges =
          choiceNames.length !== currentOptions.length ||
          choiceNames.some((c, i) => c !== currentOptions[i]);

        if (hasChanges) {
          updatedOptions[mapping.constant] = {
            field: field.name,
            before: currentOptions,
            after: choiceNames,
          };
        }
      }
    }

    const diff: SyncDiff = {
      newFields,
      updatedOptions,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({ diff, preview: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    const schema = await fetchBaseSchema();
    const inventoryTable = schema.tables.find(
      (t) => t.name === "Inventory" || t.name.toLowerCase().includes("inventory")
    );

    if (!inventoryTable) {
      return NextResponse.json({ error: "Inventory table not found in base" }, { status: 404 });
    }

    // Create timestamped backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const optionsBackupPath = join(process.cwd(), `lib/constants.options.${timestamp}.bak.ts`);
    const mapBackupPath = join(process.cwd(), `lib/constants.airtable.${timestamp}.bak.ts`);
    copyFileSync(OPTIONS_PATH, optionsBackupPath);
    copyFileSync(AIRTABLE_MAP_PATH, mapBackupPath);

    let optionsSource = readFileSync(OPTIONS_PATH, "utf-8");
    let mappingSource = readFileSync(AIRTABLE_MAP_PATH, "utf-8");

    // Update option arrays from select field choices
    const optionArrays: Record<string, string> = {
      "Restrictions (Buyer Type)": "BUYER_TYPE_OPTIONS",
      "Tag presets": "TAG_PRESET_OPTIONS",
      "Restrictions (Region)": "COUNTRY_OPTIONS",
    };

    for (const field of inventoryTable.fields) {
      const constantName = optionArrays[field.name];
      if (!constantName) continue;

      const choices = getFieldChoices(field);
      if (choices.length === 0) continue;

      const choiceStrings = choices.map((c) => `  "${c.name}"`).join(",\n");
      const replacement = `export const ${constantName} = [\n${choiceStrings},\n]`;
      const regex = new RegExp(`export const ${constantName}\\s*=\\s*\\[[\\s\\S]*?\\]`);
      optionsSource = optionsSource.replace(regex, replacement);
    }

    // Append new unmapped fields as comments
    const mappedAirtableNames = new Set(Object.values(AIRTABLE_FIELD_MAP));
    const newFields = inventoryTable.fields.filter((f) => !mappedAirtableNames.has(f.name));

    if (newFields.length > 0) {
      const existingCommentBlock = mappingSource.includes("// ─── Unmapped Airtable Fields");
      const commentLines = newFields
        .map((f) => `  // "${f.name}" (${f.type})`)
        .join("\n");

      if (!existingCommentBlock) {
        mappingSource += `\n// ─── Unmapped Airtable Fields (synced ${new Date().toISOString().split("T")[0]}) ────\n`;
        mappingSource += `// Add these to AIRTABLE_FIELD_MAP as needed:\n`;
        mappingSource += commentLines + "\n";
      }
    }

    writeFileSync(OPTIONS_PATH, optionsSource, "utf-8");
    writeFileSync(AIRTABLE_MAP_PATH, mappingSource, "utf-8");

    return NextResponse.json({
      success: true,
      backupPath: [
        `lib/constants.options.${timestamp}.bak.ts`,
        `lib/constants.airtable.${timestamp}.bak.ts`,
      ],
      newFieldsCount: newFields.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
