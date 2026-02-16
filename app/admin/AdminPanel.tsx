"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import "./admin.css";

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
    result?: { type: string };
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

interface MappingField {
  name: string;
  type: string;
  writable: boolean;
}

interface MappingRow {
  formKey: string;
  mappedField: string | null;
  status: "ok" | "missing" | "read_only" | "empty";
  fieldType?: string;
  suggestedField?: string;
  suggestionReason?: string;
}

interface SyncDiff {
  newFields: string[];
  updatedOptions: Record<string, { field: string; before: string[]; after: string[] }>;
  mappingIssues: Array<{
    formKey: string;
    mappedField: string | null;
    status: "missing" | "read_only" | "empty";
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

interface MappingApiResponse {
  fields: MappingField[];
  rows: MappingRow[];
  issuesCount: number;
  suggestionCount: number;
}

type Tab = "fields" | "mapping" | "sync";

function getChoices(field: FieldSchema): Choice[] {
  return field.options?.choices ?? field.typeOptions?.choices ?? [];
}

function getLinkedTableId(field: FieldSchema): string | undefined {
  return field.options?.linkedTableId ?? field.typeOptions?.linkedTableId;
}

function statusLabel(status: MappingRow["status"]) {
  if (status === "ok") return "OK";
  if (status === "missing") return "Missing";
  if (status === "read_only") return "Read-only";
  return "Empty";
}

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>("fields");
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mappingLoading, setMappingLoading] = useState(true);
  const [mappingRows, setMappingRows] = useState<MappingRow[]>([]);
  const [mappingFields, setMappingFields] = useState<MappingField[]>([]);
  const [mappingSearch, setMappingSearch] = useState("");
  const [mappingEdits, setMappingEdits] = useState<Record<string, string>>({});
  const [mappingSaving, setMappingSaving] = useState(false);
  const [mappingStatus, setMappingStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [mappingIssuesCount, setMappingIssuesCount] = useState(0);
  const [mappingSuggestionCount, setMappingSuggestionCount] = useState(0);

  const [syncing, setSyncing] = useState(false);
  const [syncDiff, setSyncDiff] = useState<SyncDiff | null>(null);
  const [syncResult, setSyncResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadSchema = useCallback(async () => {
    const res = await fetch("/api/admin/schema");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Schema fetch failed (${res.status})`);
    }

    const schemaTables = data.tables as TableSchema[];
    setTables(schemaTables);
    const inventory = schemaTables.find(
      (table) => table.name === "Inventory" || table.name.toLowerCase().includes("inventory")
    );
    setSelectedTable((current) => current || inventory?.name || schemaTables[0]?.name || "");
  }, []);

  const loadMappings = useCallback(async () => {
    setMappingLoading(true);
    setMappingStatus(null);
    try {
      const res = await fetch("/api/admin/mappings");
      const data = (await res.json()) as MappingApiResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || `Mapping fetch failed (${res.status})`);
      }
      setMappingFields(data.fields);
      setMappingRows(data.rows);
      setMappingIssuesCount(data.issuesCount);
      setMappingSuggestionCount(data.suggestionCount);
      setMappingEdits({});
    } catch (e) {
      setMappingStatus({ type: "error", message: (e as Error).message });
    } finally {
      setMappingLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadSchema(), loadMappings()])
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [loadMappings, loadSchema]);

  const currentTable = useMemo(
    () => tables.find((table) => table.name === selectedTable),
    [tables, selectedTable]
  );

  const filteredFields = useMemo(() => {
    if (!currentTable) return [];
    if (!search) return currentTable.fields;

    const q = search.toLowerCase();
    return currentTable.fields.filter(
      (field) =>
        field.name.toLowerCase().includes(q) ||
        field.type.toLowerCase().includes(q) ||
        (field.description ?? "").toLowerCase().includes(q)
    );
  }, [currentTable, search]);

  const filteredMappingRows = useMemo(() => {
    if (!mappingSearch.trim()) return mappingRows;

    const q = mappingSearch.toLowerCase().trim();
    return mappingRows.filter((row) => {
      const haystack = [
        row.formKey,
        row.mappedField ?? "",
        row.suggestedField ?? "",
        row.fieldType ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [mappingRows, mappingSearch]);

  const writableFieldNames = useMemo(
    () => mappingFields.filter((field) => field.writable).map((field) => field.name),
    [mappingFields]
  );

  const dirtyCount = useMemo(
    () =>
      mappingRows.filter((row) => {
        const edited = mappingEdits[row.formKey];
        if (edited === undefined) return false;
        return edited.trim() !== (row.mappedField ?? "");
      }).length,
    [mappingEdits, mappingRows]
  );

  function setEdit(formKey: string, value: string) {
    setMappingEdits((current) => ({ ...current, [formKey]: value }));
  }

  async function handleSaveMappings() {
    const updates: Record<string, string> = {};

    for (const row of mappingRows) {
      const edited = mappingEdits[row.formKey];
      if (edited === undefined) continue;
      const trimmed = edited.trim();
      if (!trimmed) continue;
      if (trimmed !== (row.mappedField ?? "")) {
        updates[row.formKey] = trimmed;
      }
    }

    if (Object.keys(updates).length === 0) {
      setMappingStatus({ type: "success", message: "No mapping changes to save." });
      return;
    }

    setMappingSaving(true);
    setMappingStatus(null);
    try {
      const res = await fetch("/api/admin/mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save mappings");
      }

      setMappingRows(data.rows as MappingRow[]);
      setMappingIssuesCount(Number(data.issuesCount ?? 0));
      setMappingSuggestionCount(Number(data.suggestionCount ?? 0));
      setMappingEdits({});
      setMappingStatus({
        type: "success",
        message: `Saved ${data.changedCount ?? 0} mapping change(s).`,
      });
    } catch (e) {
      setMappingStatus({ type: "error", message: (e as Error).message });
    } finally {
      setMappingSaving(false);
    }
  }

  async function handleApplySuggestions() {
    setMappingSaving(true);
    setMappingStatus(null);
    try {
      const res = await fetch("/api/admin/mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applySuggestions: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to apply suggestions");
      }

      setMappingRows(data.rows as MappingRow[]);
      setMappingIssuesCount(Number(data.issuesCount ?? 0));
      setMappingSuggestionCount(Number(data.suggestionCount ?? 0));
      setMappingEdits({});
      setMappingStatus({
        type: "success",
        message: `Applied ${data.changedCount ?? 0} suggested mapping fix(es).`,
      });
    } catch (e) {
      setMappingStatus({ type: "error", message: (e as Error).message });
    } finally {
      setMappingSaving(false);
    }
  }

  async function handleSyncPreview() {
    setSyncing(true);
    setSyncResult(null);
    setSyncDiff(null);
    try {
      const res = await fetch("/api/admin/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync preview failed");
      setSyncDiff(data.diff as SyncDiff);
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
      const res = await fetch("/api/admin/sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applySuggestedMappings: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync apply failed");

      const backupPaths = Array.isArray(data.backupPath)
        ? data.backupPath.filter((path: unknown) => typeof path === "string")
        : [];
      const backupSummary = backupPaths.length > 0 ? backupPaths.join(", ") : "none";
      setSyncResult({
        type: "success",
        message: `Synced options (${data.updatedOptionsCount ?? 0}) and mappings (${data.mappingUpdatedCount ?? 0}). Backup: ${backupSummary}.`,
      });
      setSyncDiff(null);
      await loadMappings();
    } catch (e) {
      setSyncResult({ type: "error", message: (e as Error).message });
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="admin">
        <div className="admin-loading">Loading schema and mappings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin">
        <div className="admin-error">Failed to load admin data: {error}</div>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="admin-header">
        <h1>Airtable Dev Panel</h1>
        <span>{tables.length} tables</span>
        <span>{mappingIssuesCount} mapping issue(s)</span>
      </div>

      <div className="admin-tabs">
        {(["fields", "mapping", "sync"] as Tab[]).map((nextTab) => (
          <button
            key={nextTab}
            className="admin-tab"
            data-active={tab === nextTab}
            onClick={() => setTab(nextTab)}
          >
            {nextTab === "fields" ? "Field Browser" : nextTab === "mapping" ? "Mappings" : "Sync"}
          </button>
        ))}
      </div>

      {tab === "fields" && (
        <>
          <div className="browser-controls">
            <select
              className="select"
              value={selectedTable}
              onChange={(event) => {
                setSelectedTable(event.target.value);
                setSearch("");
              }}
            >
              {tables.map((table) => (
                <option key={table.id} value={table.name}>
                  {table.name} ({table.fields.length} fields)
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Filter fields..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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
                {filteredFields.map((field) => (
                  <tr key={field.id}>
                    <td>
                      <span className="field-name">{field.name}</span>
                      {field.description ? (
                        <div className="field-description">{field.description}</div>
                      ) : null}
                    </td>
                    <td>
                      <span className="type-badge" data-type={field.type}>
                        {field.type}
                      </span>
                    </td>
                    <td>
                      {(field.type === "singleSelect" || field.type === "multipleSelects") && (
                        <div className="choice-pills">
                          {getChoices(field).map((choice) => (
                            <span key={choice.name} className="choice-pill">
                              {choice.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {field.type === "multipleRecordLinks" && (
                        <span className="choice-pill">
                          linked: {getLinkedTableId(field) ?? "unknown"}
                          {field.options?.prefersSingleRecordLink ? " (single)" : ""}
                        </span>
                      )}
                      {field.type === "formula" && field.options?.result != null && (
                        <span className="choice-pill">
                          {"result: " +
                            String(
                              (field.options.result as Record<string, string> | undefined)?.type ??
                                "unknown"
                            )}
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

      {tab === "mapping" && (
        <>
          <div className="browser-controls">
            <input
              className="input"
              placeholder="Filter by form key or mapped field..."
              value={mappingSearch}
              onChange={(event) => setMappingSearch(event.target.value)}
            />
          </div>

          <div className="sync-actions">
            <button className="sync-btn" disabled={mappingSaving} onClick={handleApplySuggestions}>
              {mappingSaving ? "Applying..." : `Auto-Apply Suggestions (${mappingSuggestionCount})`}
            </button>
            <button className="sync-btn" disabled={mappingSaving || dirtyCount === 0} onClick={handleSaveMappings}>
              {mappingSaving ? "Saving..." : `Save Mapping Edits (${dirtyCount})`}
            </button>
            <button className="sync-btn" disabled={mappingSaving} onClick={loadMappings}>
              Reload
            </button>
          </div>

          {mappingStatus ? (
            <div className={`sync-status ${mappingStatus.type}`}>{mappingStatus.message}</div>
          ) : null}

          {mappingLoading ? (
            <div className="empty-state">Loading mapping table...</div>
          ) : (
            <>
              <datalist id="mapping-airtable-fields">
                {writableFieldNames.map((fieldName) => (
                  <option key={fieldName} value={fieldName} />
                ))}
              </datalist>

              <table className="field-table mapping-table">
                <thead>
                  <tr>
                    <th>Form Field</th>
                    <th>Airtable Field Mapping</th>
                    <th>Status</th>
                    <th>Suggested Fix</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMappingRows.map((row) => {
                    const edited = mappingEdits[row.formKey];
                    const value = edited ?? row.mappedField ?? "";
                    return (
                      <tr key={row.formKey}>
                        <td>
                          <span className="field-name">{row.formKey}</span>
                        </td>
                        <td>
                          <input
                            className="input mapping-input"
                            list="mapping-airtable-fields"
                            value={value}
                            onChange={(event) => setEdit(row.formKey, event.target.value)}
                          />
                        </td>
                        <td>
                          <span className={`mapping-status mapping-status--${row.status}`}>
                            {statusLabel(row.status)}
                            {row.fieldType ? ` (${row.fieldType})` : ""}
                          </span>
                        </td>
                        <td>
                          {row.suggestedField ? (
                            <button
                              className="mapping-suggestion-btn"
                              onClick={() => setEdit(row.formKey, row.suggestedField ?? "")}
                            >
                              Use {row.suggestedField}
                            </button>
                          ) : (
                            <span className="field-description">—</span>
                          )}
                          {row.suggestionReason ? (
                            <div className="field-description">{row.suggestionReason}</div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      {tab === "sync" && (
        <div className="sync-panel">
          <button className="sync-btn" disabled={syncing} onClick={handleSyncPreview}>
            {syncing ? "Checking..." : "Preview Sync from Airtable"}
          </button>

          {syncResult ? <div className={`sync-status ${syncResult.type}`}>{syncResult.message}</div> : null}

          {syncDiff ? (
            <>
              {syncDiff.mappingIssues.length > 0 ? (
                <div className="diff-section">
                  <h3>Mapping issues</h3>
                  <ul className="diff-list">
                    {syncDiff.mappingIssues.map((issue) => (
                      <li key={`${issue.formKey}-${issue.mappedField ?? "empty"}`}>
                        {issue.formKey}: {issue.mappedField ?? "—"} [{issue.status}]
                        {issue.suggestedField ? ` -> ${issue.suggestedField}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {syncDiff.newFields.length > 0 ? (
                <div className="diff-section">
                  <h3>Unmapped Airtable fields</h3>
                  <ul className="diff-list">
                    {syncDiff.newFields.map((fieldName) => (
                      <li key={fieldName} className="added">
                        + {fieldName}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {Object.keys(syncDiff.updatedOptions).length > 0 ? (
                <div className="diff-section">
                  <h3>Option changes</h3>
                  {Object.entries(syncDiff.updatedOptions).map(([constant, info]) => {
                    const added = info.after.filter((option) => !info.before.includes(option));
                    const removed = info.before.filter((option) => !info.after.includes(option));
                    return (
                      <div key={constant} className="diff-option-group">
                        <h4>
                          {constant} ({info.field})
                        </h4>
                        <ul className="diff-list">
                          {added.map((option) => (
                            <li key={`add-${constant}-${option}`} className="added">
                              + {option}
                            </li>
                          ))}
                          {removed.map((option) => (
                            <li key={`remove-${constant}-${option}`} className="removed">
                              - {option}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {syncDiff.mappingIssues.length === 0 &&
              syncDiff.newFields.length === 0 &&
              Object.keys(syncDiff.updatedOptions).length === 0 ? (
                <div className="sync-status info">Everything is in sync. No changes detected.</div>
              ) : (
                <div className="sync-actions">
                  <button className="sync-btn danger" disabled={syncing} onClick={handleSyncApply}>
                    {syncing ? "Applying..." : "Apply Sync Fixes"}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
