"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import type { ItemizationFormData, FormFieldName, LinkedRecord } from "@/lib/types";
import { HELPER_TEXT } from "@/lib/constants/form";
import {
  getLinkedRecordCache,
  makeLinkedRecordCacheKey,
  setLinkedRecordCache,
} from "@/lib/linked-record-cache";

interface LinkedRecordPickerProps {
  name: FormFieldName;
  label: string;
  table: string;
  displayField: string;
  mode: "single" | "multi";
  required?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
  onSelectRecord?: (record: LinkedRecord | null) => void;
  onRecordsChange?: (records: LinkedRecord[]) => void;
  previewFields?: string[];
  sortField?: string;
  sortDirection?: "asc" | "desc";
  initialRecords?: LinkedRecord[];
}

export function LinkedRecordPicker({
  name,
  label,
  table,
  displayField,
  mode,
  required,
  placeholder,
  onChange,
  onSelectRecord,
  onRecordsChange,
  previewFields,
  sortField,
  sortDirection,
  initialRecords,
}: LinkedRecordPickerProps) {
  const { setValue, formState: { errors } } = useFormContext<ItemizationFormData>();
  const helper = HELPER_TEXT[name];
  const error = errors[name];

  const [query, setQuery] = useState(
    mode === "single" && initialRecords?.[0] ? initialRecords[0].name : ""
  );
  const [results, setResults] = useState<LinkedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [selectedRecords, setSelectedRecords] = useState<LinkedRecord[]>(initialRecords ?? []);
  const searchGenRef = useRef(0);

  const doSearch = useCallback(
    async (q: string) => {
      const gen = ++searchGenRef.current;
      const cacheKey = makeLinkedRecordCacheKey({
        fieldName: name,
        table,
        displayField,
        query: q,
        extraFields: previewFields,
        sortField,
        sortDirection: sortDirection ?? "asc",
      });
      const cached = getLinkedRecordCache(cacheKey);
      if (cached) {
        if (gen !== searchGenRef.current) return;
        setResults(cached);
        setLoading(false);
        setSearchError(null);
        return;
      }

      setLoading(true);
      setSearchError(null);
      try {
        const data = await fetchLinkedRecordOptions(name, q);
        if (gen !== searchGenRef.current) return;
        setResults(data.records);
        if (data.error) {
          setSearchError(data.error);
        } else {
          setSearchError(null);
          setLinkedRecordCache(cacheKey, data.records);
        }
      } catch (err) {
        if (gen !== searchGenRef.current) return;
        const message = normalizeLookupError(err);
        setSearchError(message);
        setResults([]);
      } finally {
        if (gen === searchGenRef.current) setLoading(false);
      }
    },
    [displayField, name, previewFields, sortDirection, sortField, table]
  );

  function handleInputChange(value: string) {
    setQuery(value);
    setOpen(true);
    setSearchError(null);

    if (mode === "single" && selectedRecords.length > 0) {
      setSelectedRecords([]);
      setValue(name, "" as never, { shouldValidate: true });
      onChange?.("");
      onSelectRecord?.(null);
      onRecordsChange?.([]);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleSelect(record: LinkedRecord) {
    if (mode === "single") {
      setSelectedRecords([record]);
      setQuery(record.name);
      setValue(name, record.id as never, { shouldValidate: true });
      onChange?.(record.id);
      onSelectRecord?.(record);
      onRecordsChange?.([record]);
      setOpen(false);
    } else {
      const current = selectedRecords;
      if (!current.find((r) => r.id === record.id)) {
        const next = [...current, record];
        setSelectedRecords(next);
        setValue(name, next.map((r) => r.id) as never, { shouldValidate: true });
        onRecordsChange?.(next);
      }
      setQuery("");
      setOpen(false);
    }
    setSearchError(null);
  }

  function handleRemove(id: string) {
    const next = selectedRecords.filter((r) => r.id !== id);
    setSelectedRecords(next);
    setValue(name, next.map((r) => r.id) as never, { shouldValidate: true });
    onRecordsChange?.(next);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleFocus() {
    if (results.length === 0 && !loading) {
      doSearch(query);
    }
    setOpen(true);
  }

  const isSelected = (id: string) => selectedRecords.some((s) => s.id === id);

  return (
    <div className="field-group" ref={containerRef} data-field-name={name}>
      <label className="field-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      {helper && <p className="field-helper">{helper}</p>}

      {mode === "multi" && selectedRecords.length > 0 && (
        <div className="selected-pills">
          {selectedRecords.map((r) => (
            <span key={r.id} className="selected-pill">
              {r.name}
              <button type="button" onClick={() => handleRemove(r.id)}>×</button>
            </span>
          ))}
        </div>
      )}

      <div className="picker-wrapper">
        <input
          id={name}
          name={name}
          type="text"
          className="input"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          autoComplete="off"
        />

        {open && (
          <div className="picker-dropdown">
            {loading && (
              <>
                <div className="picker-skeleton"><div className="picker-skeleton-line picker-skeleton-primary" /><div className="picker-skeleton-line picker-skeleton-secondary" /></div>
                <div className="picker-skeleton"><div className="picker-skeleton-line picker-skeleton-primary" /><div className="picker-skeleton-line picker-skeleton-secondary" /></div>
                <div className="picker-skeleton"><div className="picker-skeleton-line picker-skeleton-primary" /><div className="picker-skeleton-line picker-skeleton-secondary" /></div>
              </>
            )}
            {!loading && results.length === 0 && query && (
              <div className="picker-item picker-empty">No results</div>
            )}
            {!loading &&
              results
                .filter((r) =>
                  mode === "multi"
                    ? !isSelected(r.id)
                    : true
                )
                .map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="picker-item-rich"
                    onClick={() => handleSelect(r)}
                  >
                    {mode === "multi" && isSelected(r.id) && (
                      <span className="picker-item-check">&#10003;</span>
                    )}
                    <span className="picker-item-primary">{r.name}</span>
                    {r.metadata && Object.keys(r.metadata).length > 0 && (
                      <span className="picker-item-meta">
                        {Object.entries(r.metadata).map(([k, v]) => (
                          <span key={k}>{k}: {v}</span>
                        ))}
                      </span>
                    )}
                  </button>
                ))}
          </div>
        )}
      </div>

      {error && <p className="field-error">{error.message as string}</p>}
      {!error && searchError && <p className="field-error">{searchError}</p>}
    </div>
  );
}

function normalizeLookupError(err: unknown) {
  const message = err instanceof Error ? err.message : "Failed to load options";
  if (/server components render/i.test(message) || /digest property/i.test(message)) {
    return "Unable to load linked records right now. Please try again.";
  }
  return message;
}

interface LinkedLookupApiResponse {
  records: LinkedRecord[];
  error?: string;
}

async function fetchLinkedRecordOptions(
  fieldName: FormFieldName,
  query: string
): Promise<LinkedLookupApiResponse> {
  const params = new URLSearchParams();
  params.set("field", fieldName);
  params.set("query", query);

  const response = await fetch(`/api/form/linked-records?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });

  let payload: LinkedLookupApiResponse | null = null;
  try {
    payload = (await response.json()) as LinkedLookupApiResponse;
  } catch {
    payload = null;
  }

  if (!response.ok && !payload?.error) {
    throw new Error(`Linked record lookup failed (${response.status})`);
  }

  return payload ?? { records: [], error: "Unable to load linked records right now. Please try again." };
}
