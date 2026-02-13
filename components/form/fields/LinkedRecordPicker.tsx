"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import type { ItemizationFormData, FormFieldName, LinkedRecord } from "@/lib/types";
import { HELPER_TEXT } from "@/lib/constants";
import { searchLinkedRecords } from "@/app/actions/fetch-options";

interface LinkedRecordPickerProps {
  name: FormFieldName;
  label: string;
  table: string;
  displayField: string;
  mode: "single" | "multi";
  required?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
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
  onRecordsChange,
  previewFields,
  sortField,
  sortDirection,
  initialRecords,
}: LinkedRecordPickerProps) {
  const { setValue, watch, formState: { errors } } = useFormContext<ItemizationFormData>();
  const helper = HELPER_TEXT[name];
  const error = errors[name];

  const [query, setQuery] = useState(
    mode === "single" && initialRecords?.[0] ? initialRecords[0].name : ""
  );
  const [results, setResults] = useState<LinkedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [selectedRecords, setSelectedRecords] = useState<LinkedRecord[]>(initialRecords ?? []);
  const searchGenRef = useRef(0);

  const doSearch = useCallback(
    async (q: string) => {
      const gen = ++searchGenRef.current;
      setLoading(true);
      try {
        const sort = sortField ? { field: sortField, direction: sortDirection ?? ("asc" as const) } : undefined;
        const data = await searchLinkedRecords(table, displayField, q, previewFields, sort);
        if (gen !== searchGenRef.current) return;
        setResults(data);
      } catch {
        if (gen !== searchGenRef.current) return;
        setResults([]);
      } finally {
        if (gen === searchGenRef.current) setLoading(false);
      }
    },
    [table, displayField, previewFields, sortField, sortDirection]
  );

  function handleInputChange(value: string) {
    setQuery(value);
    setOpen(true);

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
      setQuery(record.name);
      setValue(name, record.name as never, { shouldValidate: true });
      onChange?.(record.name);
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
    <div className="field-group" ref={containerRef}>
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
    </div>
  );
}
