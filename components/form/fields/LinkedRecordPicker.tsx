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
}: LinkedRecordPickerProps) {
  const { setValue, watch, formState: { errors } } = useFormContext<ItemizationFormData>();
  const helper = HELPER_TEXT[name];
  const error = errors[name];

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LinkedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Current value(s)
  const rawValue = watch(name);

  // For single mode: value is a string (the name displayed, ID stored separately)
  // For multi mode: value is string[] of IDs, we track display names locally
  const [selectedRecords, setSelectedRecords] = useState<LinkedRecord[]>([]);

  const doSearch = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const data = await searchLinkedRecords(table, displayField, q);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [table, displayField]
  );

  function handleInputChange(value: string) {
    setQuery(value);
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  }

  function handleSelect(record: LinkedRecord) {
    if (mode === "single") {
      setQuery(record.name);
      setValue(name, record.name as never, { shouldValidate: true });
      onChange?.(record.name);
      setOpen(false);
    } else {
      const current = selectedRecords;
      if (!current.find((r) => r.id === record.id)) {
        const next = [...current, record];
        setSelectedRecords(next);
        setValue(name, next.map((r) => r.id) as never, { shouldValidate: true });
      }
      setQuery("");
      setOpen(false);
    }
  }

  function handleRemove(id: string) {
    const next = selectedRecords.filter((r) => r.id !== id);
    setSelectedRecords(next);
    setValue(name, next.map((r) => r.id) as never, { shouldValidate: true });
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Load initial results on focus
  function handleFocus() {
    if (results.length === 0 && !loading) {
      doSearch(query);
    }
    setOpen(true);
  }

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
            {loading && <div className="picker-item picker-loading">Searching...</div>}
            {!loading && results.length === 0 && query && (
              <div className="picker-item picker-empty">No results</div>
            )}
            {!loading &&
              results
                .filter((r) =>
                  mode === "multi"
                    ? !selectedRecords.find((s) => s.id === r.id)
                    : true
                )
                .map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="picker-item"
                    onClick={() => handleSelect(r)}
                  >
                    {r.name}
                  </button>
                ))}
          </div>
        )}
      </div>

      {error && <p className="field-error">{error.message as string}</p>}
    </div>
  );
}
