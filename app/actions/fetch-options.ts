"use server";

import { listRecords } from "@/lib/airtable";

export async function searchLinkedRecords(
  table: string,
  displayField: string,
  query: string
): Promise<Array<{ id: string; name: string }>> {
  try {
    const filter = query
      ? `SEARCH(LOWER("${query.replace(/"/g, '\\"')}"), LOWER({${displayField}}))`
      : "";

    const records = await listRecords(table, {
      fields: [displayField],
      maxRecords: 25,
      filterFormula: filter || undefined,
    });

    return records.map((r) => ({
      id: r.id,
      name: (r.fields[displayField] as string) ?? "",
    }));
  } catch {
    return [];
  }
}
