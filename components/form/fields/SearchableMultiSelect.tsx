"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import type { ItemizationFormData, FormFieldName } from "@/lib/types";
import { HELPER_TEXT } from "@/lib/constants/form";

interface SearchableMultiSelectProps {
  name: FormFieldName;
  label: string;
  options: string[];
  pinnedOptions?: string[];
  mode?: "single" | "multi";
  required?: boolean;
  placeholder?: string;
  maxVisible?: number;
}

const RESULT_CAP = 50;
const MAX_DROPDOWN = 8;

export function SearchableMultiSelect({
  name,
  label,
  options,
  pinnedOptions = [],
  mode = "multi",
  required,
  placeholder = "Search...",
  maxVisible = 5,
}: SearchableMultiSelectProps) {
  const { setValue, watch, formState: { errors } } = useFormContext<ItemizationFormData>();
  const raw = watch(name);
  const selected: string[] = mode === "multi"
    ? ((raw as string[]) || [])
    : (raw ? [raw as string] : []);
  const helper = HELPER_TEXT[name];
  const error = errors[name];

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter options with early break cap
  const filtered = (() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: string[] = [];
    for (const opt of options) {
      if (results.length >= RESULT_CAP) break;
      if (opt.toLowerCase().includes(q) && !selected.includes(opt)) {
        results.push(opt);
      }
    }
    return results;
  })();

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const selectOption = useCallback((opt: string) => {
    if (mode === "single") {
      setValue(name, opt as never, { shouldValidate: true });
      setOpen(false);
      setQuery("");
    } else {
      const next = [...selected, opt];
      setValue(name, next as never, { shouldValidate: true });
    }
    setActiveIndex(-1);
    inputRef.current?.focus();
  }, [mode, name, selected, setValue]);

  const removeOption = useCallback((opt: string) => {
    if (mode === "single") {
      setValue(name, "" as never, { shouldValidate: true });
    } else {
      setValue(name, selected.filter((v) => v !== opt) as never, { shouldValidate: true });
    }
    inputRef.current?.focus();
  }, [mode, name, selected, setValue]);

  const togglePinned = useCallback((opt: string) => {
    if (selected.includes(opt)) {
      removeOption(opt);
    } else {
      selectOption(opt);
    }
  }, [selected, removeOption, selectOption]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open && query) setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) {
        selectOption(filtered[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      setActiveIndex(-1);
    } else if (e.key === "Backspace" && !query && selected.length > 0) {
      removeOption(selected[selected.length - 1]);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    setOpen(v.trim().length > 0);
    setActiveIndex(-1);
  }

  const visiblePills = selected.slice(0, maxVisible);
  const overflowCount = selected.length - maxVisible;
  const listboxId = `${name}-listbox`;
  const activeDescendant = activeIndex >= 0 ? `${name}-opt-${activeIndex}` : undefined;

  return (
    <div className="field-group">
      <span className="field-label">
        {label}
        {required && <span className="required">*</span>}
      </span>
      {helper && <p className="field-helper">{helper}</p>}

      <div
        className="searchable-multiselect"
        ref={wrapperRef}
      >
        {/* Selected tags (multi mode) */}
        {mode === "multi" && selected.length > 0 && (
          <div className="selected-tags">
            {visiblePills.map((opt) => (
              <span key={opt} className="sms-tag">
                {opt}
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => removeOption(opt)}
                  aria-label={`Remove ${opt}`}
                >
                  &times;
                </button>
              </span>
            ))}
            {overflowCount > 0 && (
              <span className="sms-tag sms-tag--overflow">+{overflowCount} more</span>
            )}
          </div>
        )}

        {/* Pinned options */}
        {pinnedOptions.length > 0 && (
          <div className="pinned-options">
            {pinnedOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`pinned-pill${selected.includes(opt) ? " pinned-pill--active" : ""}`}
                onClick={() => togglePinned(opt)}
                aria-pressed={selected.includes(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Search input */}
        <div className="sms-input-wrap">
          <svg className="sms-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="sms-input"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-activedescendant={activeDescendant}
            placeholder={mode === "single" && selected.length > 0 ? selected[0] : placeholder}
            value={query}
            onChange={handleInputChange}
            onFocus={() => { if (query.trim()) setOpen(true); }}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Dropdown */}
        {open && filtered.length > 0 && (
          <ul
            id={listboxId}
            ref={listRef}
            className="search-dropdown"
            role="listbox"
            aria-multiselectable={mode === "multi" || undefined}
          >
            {filtered.slice(0, MAX_DROPDOWN * 3).map((opt, i) => (
              <li
                key={opt}
                id={`${name}-opt-${i}`}
                role="option"
                aria-selected={selected.includes(opt)}
                className={`search-result-item${i === activeIndex ? " search-result-item--active" : ""}`}
                onMouseDown={(e) => { e.preventDefault(); selectOption(opt); }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {opt}
              </li>
            ))}
          </ul>
        )}

        {open && query.trim() && filtered.length === 0 && (
          <div className="search-dropdown search-dropdown--empty">
            <span className="search-empty-msg">No results</span>
          </div>
        )}
      </div>

      {error && <p className="field-error">{error.message as string}</p>}
    </div>
  );
}
