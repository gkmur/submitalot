"use server";

import { listRecords } from "@/lib/airtable";
import { LINKED_RECORD_FIELDS } from "@/lib/linked-records";

const ALLOWED_CONFIGS = new Map(
  Object.values(LINKED_RECORD_FIELDS).map((cfg) => [cfg.table, cfg])
);

export async function searchLinkedRecords(
  table: string,
  displayField: string,
  query: string,
  extraFields?: string[],
  sort?: { field: string; direction: "asc" | "desc" }
): Promise<Array<{ id: string; name: string; metadata?: Record<string, string> }>> {
  try {
    const config = ALLOWED_CONFIGS.get(table);
    if (!config || config.displayField !== displayField) {
      throw new Error("Invalid table or display field");
    }

    const allowedExtra = new Set(config.previewFields ?? []);
    if (extraFields) {
      for (const f of extraFields) {
        if (!allowedExtra.has(f)) throw new Error("Invalid extra field");
      }
    }
    if (sort && sort.field !== config.sortField) {
      throw new Error("Invalid sort field");
    }

    const sanitized = query.replace(/["\\\n\r]/g, "");
    const filter = sanitized
      ? `SEARCH(LOWER("${sanitized}"), LOWER({${displayField}}))`
      : "";

    const allFields = [displayField, ...(extraFields ?? [])];

    const records = await listRecords(table, {
      fields: allFields,
      maxRecords: 50,
      filterFormula: filter || undefined,
      sort: sort,
    });

    return records.map((r) => {
      const metadata: Record<string, string> = {};
      if (extraFields) {
        for (const f of extraFields) {
          const val = r.fields[f];
          if (val != null) metadata[f] = String(val);
        }
      }
      return {
        id: r.id,
        name: (r.fields[displayField] as string) ?? "",
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };
    });
  } catch {
    return [];
  }
}
