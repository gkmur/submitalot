import "server-only";

const BASE_URL = "https://api.airtable.com/v0";

function getConfig() {
  const pat = process.env.AIRTABLE_PAT;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!pat || pat === "your_pat_here") throw new Error("AIRTABLE_PAT is not configured");
  if (!baseId) throw new Error("AIRTABLE_BASE_ID is not configured");
  return { pat, baseId };
}

function headers(pat: string) {
  return {
    Authorization: `Bearer ${pat}`,
    "Content-Type": "application/json",
  };
}

export async function createRecord(
  tableName: string,
  fields: Record<string, unknown>
): Promise<{ id: string }> {
  const { pat, baseId } = getConfig();
  const res = await fetch(`${BASE_URL}/${baseId}/${encodeURIComponent(tableName)}`, {
    method: "POST",
    headers: headers(pat),
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`Airtable create failed (${res.status}): ${JSON.stringify(error)}`);
  }

  const data = await res.json();
  return { id: data.id };
}

export async function listRecords(
  tableName: string,
  options?: { fields?: string[]; maxRecords?: number; filterFormula?: string; sort?: { field: string; direction: "asc" | "desc" } }
): Promise<Array<{ id: string; fields: Record<string, unknown> }>> {
  const { pat, baseId } = getConfig();
  const params = new URLSearchParams();
  if (options?.fields) options.fields.forEach(f => params.append("fields[]", f));
  if (options?.maxRecords) params.set("maxRecords", String(options.maxRecords));
  if (options?.filterFormula) params.set("filterByFormula", options.filterFormula);
  if (options?.sort) {
    params.set("sort[0][field]", options.sort.field);
    params.set("sort[0][direction]", options.sort.direction);
  }

  const res = await fetch(
    `${BASE_URL}/${baseId}/${encodeURIComponent(tableName)}?${params}`,
    { headers: headers(pat), next: { revalidate: 300 } }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`Airtable list failed (${res.status}): ${JSON.stringify(error)}`);
  }

  const data = await res.json();
  return data.records;
}
