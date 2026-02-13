import "server-only";

const META_URL = "https://api.airtable.com/v0/meta/bases";

function getConfig() {
  const pat = process.env.AIRTABLE_PAT;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!pat || pat === "your_pat_here") throw new Error("AIRTABLE_PAT is not configured");
  if (!baseId) throw new Error("AIRTABLE_BASE_ID is not configured");
  return { pat, baseId };
}

// ─── Schema Types ────────────────────────────────────────────────────────────

export interface AirtableChoice {
  id?: string;
  name: string;
  color?: string;
}

export interface AirtableFieldSchema {
  id: string;
  name: string;
  type: string;
  description?: string;
  options?: {
    choices?: AirtableChoice[];
    linkedTableId?: string;
    prefersSingleRecordLink?: boolean;
    inverseLinkFieldId?: string;
    result?: { type: string };
    [key: string]: unknown;
  };
  // older API shape
  typeOptions?: {
    choices?: AirtableChoice[];
    linkedTableId?: string;
    [key: string]: unknown;
  };
}

export interface AirtableTableSchema {
  id: string;
  name: string;
  description?: string;
  primaryFieldId: string;
  fields: AirtableFieldSchema[];
}

export interface AirtableBaseSchema {
  tables: AirtableTableSchema[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getFieldChoices(field: AirtableFieldSchema): AirtableChoice[] {
  return field.options?.choices ?? field.typeOptions?.choices ?? [];
}

export function getLinkedTableId(field: AirtableFieldSchema): string | undefined {
  return field.options?.linkedTableId ?? field.typeOptions?.linkedTableId;
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

export async function fetchBaseSchema(): Promise<AirtableBaseSchema> {
  const { pat, baseId } = getConfig();

  const res = await fetch(`${META_URL}/${baseId}/tables`, {
    headers: { Authorization: `Bearer ${pat}` },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Airtable metadata fetch failed (${res.status}): ${JSON.stringify(err)}`);
  }

  return res.json();
}
