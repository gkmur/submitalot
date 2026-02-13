"use client";

import { useState, useEffect, useMemo } from "react";
import { AIRTABLE_FIELD_MAP } from "@/lib/constants";
import type { ItemizationFormData } from "@/lib/types";
import "./admin.css";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Choice {
  id?: string;
  name: string;
  color?: string;
}

interface FieldSchema {
  id: string;
  name: string;
  type: string;
  description?: string;
  options?: {
    choices?: Choice[];
    linkedTableId?: string;
    prefersSingleRecordLink?: boolean;
    [key: string]: unknown;
  };
  typeOptions?: {
    choices?: Choice[];
    linkedTableId?: string;
    [key: string]: unknown;
  };
}

interface TableSchema {
  id: string;
  name: string;
  description?: string;
  primaryFieldId: string;
  fields: FieldSchema[];
}

interface SyncDiff {
  newFields: string[];
  updatedOptions: Record<string, { field: string; before: string[]; after: string[] }>;
  timestamp: string;
}

type Tab = "fields" | "mapping" | "sync";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getChoices(field: FieldSchema): Choice[] {
  return field.options?.choices ?? field.typeOptions?.choices ?? [];
}

function getLinkedTableId(field: FieldSchema): string | undefined {
  return field.options?.linkedTableId ?? field.typeOptions?.linkedTableId;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>("fields");
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncDiff, setSyncDiff] = useState<SyncDiff | null>(null);
  const [syncResult, setSyncResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Mapping snippet
  const [snippetField, setSnippetField] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/schema")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data: { tables: TableSchema[] }) => {
        setTables(data.tables);
        // Default to Inventory table if it exists
        const inv = data.tables.find(
          (t) => t.name === "Inventory" || t.name.toLowerCase().includes("inventory")
        );
        setSelectedTable(inv?.name ?? data.tables[0]?.name ?? "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const currentTable = tables.find((t) => t.name === selectedTable);

  const filteredFields = useMemo(() => {
    if (!currentTable) return [];
    if (!search) return currentTable.fields;
    const q = search.toLowerCase();
    return currentTable.fields.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q)
    );
  }, [currentTable, search]);

  // Build mapping data
  const reverseMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [formKey, atKey] of Object.entries(AIRTABLE_FIELD_MAP)) {
      if (atKey) m[atKey] = formKey;
    }
    return m;
  }, []);

  const mappingRows = useMemo(() => {
    if (!currentTable) return [];

    const airtableNames = new Set(currentTable.fields.map((f) => f.name));
    const formKeys = Object.keys(AIRTABLE_FIELD_MAP) as (keyof ItemizationFormData)[];

    type MappingRow = {
      airtableName: string | null;
      formKey: string | null;
      status: "mapped" | "unmapped-at" | "unmapped-form";
    };

    const rows: MappingRow[] = [];

    // Mapped pairs first
    for (const [formKey, atName] of Object.entries(AIRTABLE_FIELD_MAP)) {
      if (atName && airtableNames.has(atName)) {
        rows.push({ airtableName: atName, formKey, status: "mapped" });
      }
    }

    // Unmapped Airtable fields
    const mappedAtNames = new Set(Object.values(AIRTABLE_FIELD_MAP).filter(Boolean));
    for (const field of currentTable.fields) {
      if (!mappedAtNames.has(field.name)) {
        rows.push({ airtableName: field.name, formKey: null, status: "unmapped-at" });
      }
    }

    // Unmapped form fields (mapped to a name not found in current table)
    for (const formKey of formKeys) {
      const atName = AIRTABLE_FIELD_MAP[formKey];
      if (atName && !airtableNames.has(atName)) {
        rows.push({ airtableName: atName, formKey: formKey as string, status: "unmapped-form" });
      }
    }

    return rows;
  }, [currentTable, reverseMap]);

  async function handleSyncPreview() {
    setSyncing(true);
    setSyncResult(null);
    setSyncDiff(null);
    try {
      const res = await fetch("/api/admin/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setSyncDiff(data.diff);
    } catch (e) {
      setSyncResult({ type: "error", message: (e as Error).message });
    } finally {
      setSyncing(false);
    }
  }

  async function handleSyncApply() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/sync", { method: "PUT" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Apply failed");
      setSyncResult({
        type: "success",
        message: `Synced. Backup: ${data.backupPath}. ${data.newFieldsCount} new field(s) detected.`,
      });
      setSyncDiff(null);
    } catch (e) {
      setSyncResult({ type: "error", message: (e as Error).message });
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <div className="admin"><div className="admin-loading">Loading schema...</div></div>;
  if (error) return <div className="admin"><div className="admin-error">Failed to load schema: {error}</div></div>;

  return (
    <div className="admin">
      <div className="admin-header">
        <h1>Airtable Dev Panel</h1>
        <span>{tables.length} tables</span>
      </div>

      <div className="admin-tabs">
        {(["fields", "mapping", "sync"] as Tab[]).map((t) => (
          <button
            key={t}
            className="admin-tab"
            data-active={tab === t}
            onClick={() => setTab(t)}
          >
            {t === "fields" ? "Field Browser" : t === "mapping" ? "Mapping" : "Sync"}
          </button>
        ))}
      </div>

      {/* ─── Tab: Field Browser ───────────────────────── */}
      {tab === "fields" && (
        <>
          <div className="browser-controls">
            <select
              className="select"
              value={selectedTable}
              onChange={(e) => { setSelectedTable(e.target.value); setSearch(""); }}
            >
              {tables.map((t) => (
                <option key={t.id} value={t.name}>{t.name} ({t.fields.length} fields)</option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Filter fields..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filteredFields.length === 0 ? (
            <div className="empty-state">No fields match your filter.</div>
          ) : (
            <table className="field-table">
              <thead>
                <tr>
                  <th>Field Name</th>
                  <th>Type</th>
                  <th>Options / Info</th>
                </tr>
              </thead>
              <tbody>
                {filteredFields.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <span className="field-name">{f.name}</span>
                      {f.description && <div className="field-description">{f.description}</div>}
                    </td>
                    <td>
                      <span className="type-badge" data-type={f.type}>{f.type}</span>
                    </td>
                    <td>
                      {(f.type === "singleSelect" || f.type === "multipleSelects") && (
                        <div className="choice-pills">
                          {getChoices(f).map((c) => (
                            <span key={c.name} className="choice-pill">{c.name}</span>
                          ))}
                        </div>
                      )}
                      {f.type === "multipleRecordLinks" && (
                        <span className="choice-pill">
                          linked: {getLinkedTableId(f) ?? "unknown"}
                          {f.options?.prefersSingleRecordLink ? " (single)" : ""}
                        </span>
                      )}
                      {f.type === "formula" && f.options?.result != null && (
                        <span className="choice-pill">
                          {"result: " + String((f.options.result as Record<string, string>)?.type ?? "unknown")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ─── Tab: Mapping View ────────────────────────── */}
      {tab === "mapping" && (
        <>
          <div className="browser-controls">
            <select
              className="select"
              value={selectedTable}
              onChange={(e) => { setSelectedTable(e.target.value); setSnippetField(null); }}
            >
              {tables.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="mapping-grid">
            <div className="mapping-grid-header">
              <span>Airtable Field</span>
              <span></span>
              <span>Form Field</span>
            </div>

            {mappingRows.map((row, i) => (
              <div key={i} className="mapping-row">
                <div className="mapping-cell">
                  <span className={`mapping-dot ${row.status}`} />
                  <span className={`field-name ${row.status !== "mapped" ? "muted" : ""}`}>
                    {row.airtableName ?? "—"}
                  </span>
                </div>
                <div className="mapping-arrow">
                  {row.status === "mapped" ? "↔" : "·"}
                </div>
                <div
                  className="mapping-cell"
                  style={{ cursor: row.status === "unmapped-at" ? "pointer" : undefined }}
                  onClick={() => {
                    if (row.status === "unmapped-at") {
                      setSnippetField(snippetField === row.airtableName ? null : row.airtableName);
                    }
                  }}
                >
                  <span className={`field-name ${row.status === "unmapped-at" ? "muted" : row.status === "unmapped-form" ? "" : ""}`}>
                    {row.formKey ?? (row.status === "unmapped-at" ? "click for snippet" : "—")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {snippetField && (
            <div className="mapping-snippet">
              {`// In lib/constants.ts → AIRTABLE_FIELD_MAP\n`}
              {`  yourFormKey: "${snippetField}",\n\n`}
              {`// In lib/types.ts → ItemizationFormData\n`}
              {`  yourFormKey: string; // adjust type as needed`}
            </div>
          )}
        </>
      )}

      {/* ─── Tab: Sync ────────────────────────────────── */}
      {tab === "sync" && (
        <div className="sync-panel">
          <button
            className="sync-btn"
            disabled={syncing}
            onClick={handleSyncPreview}
          >
            {syncing ? "Checking..." : "Sync from Airtable"}
          </button>

          {syncResult && (
            <div className={`sync-status ${syncResult.type}`}>
              {syncResult.message}
            </div>
          )}

          {syncDiff && (
            <>
              {syncDiff.newFields.length > 0 && (
                <div className="diff-section">
                  <h3>New Airtable fields (not mapped)</h3>
                  <ul className="diff-list">
                    {syncDiff.newFields.map((f) => (
                      <li key={f} className="added">+ {f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Object.keys(syncDiff.updatedOptions).length > 0 && (
                <div className="diff-section">
                  <h3>Option changes</h3>
                  {Object.entries(syncDiff.updatedOptions).map(([constant, info]) => {
                    const added = info.after.filter((o) => !info.before.includes(o));
                    const removed = info.before.filter((o) => !info.after.includes(o));
                    return (
                      <div key={constant} className="diff-option-group">
                        <h4>{constant} ({info.field})</h4>
                        <ul className="diff-list">
                          {added.map((o) => <li key={o} className="added">+ {o}</li>)}
                          {removed.map((o) => <li key={o} className="removed">- {o}</li>)}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}

              {syncDiff.newFields.length === 0 && Object.keys(syncDiff.updatedOptions).length === 0 && (
                <div className="sync-status info">Everything is in sync. No changes detected.</div>
              )}

              {(syncDiff.newFields.length > 0 || Object.keys(syncDiff.updatedOptions).length > 0) && (
                <div className="sync-actions">
                  <button
                    className="sync-btn danger"
                    disabled={syncing}
                    onClick={handleSyncApply}
                  >
                    {syncing ? "Applying..." : "Apply Changes"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
