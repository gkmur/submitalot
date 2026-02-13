"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  getHistory,
  getTemplates,
  saveTemplate,
  deleteTemplate,
  type HistoryEntry,
  type Template,
} from "@/lib/storage";

type Tab = "recent" | "templates";

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onClone: (entry: HistoryEntry | Template) => void;
  onSaveTemplate: (name: string) => void;
  currentFormDirty: boolean;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function entryPreview(data: Record<string, unknown>): { primary: string; secondary: string } {
  const brand = (data.brandPartner as string) || "";
  const seller = (data.seller as string) || "";
  const type = (data.inventoryType as string) || "";
  const primary = [brand, seller].filter(Boolean).join(" / ") || "Untitled";
  return { primary, secondary: type };
}

export function HistoryDrawer({ open, onClose, onClone, onSaveTemplate, currentFormDirty }: HistoryDrawerProps) {
  const [tab, setTab] = useState<Tab>("recent");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [undoEntry, setUndoEntry] = useState<{ template: Template; timer: ReturnType<typeof setTimeout> } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Lazy-load on open
  useEffect(() => {
    if (open) {
      setHistory(getHistory());
      setTemplates(getTemplates());
    }
  }, [open]);

  // Focus template input when entering save mode
  useEffect(() => {
    if (saving && inputRef.current) inputRef.current.focus();
  }, [saving]);

  // Escape key closes drawer
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Commit pending deletion on drawer close/unmount
  const undoRef = useRef(undoEntry);
  undoRef.current = undoEntry;
  useEffect(() => {
    if (!open && undoRef.current) {
      clearTimeout(undoRef.current.timer);
      deleteTemplate(undoRef.current.template.id);
      setUndoEntry(null);
    }
  }, [open]);

  const counts = useMemo(() => ({
    recent: history.length,
    templates: templates.length,
  }), [history.length, templates.length]);

  const handleClone = useCallback((entry: HistoryEntry | Template) => {
    if (currentFormDirty && !confirm("Load this data? Current form data will be replaced.")) return;
    onClone(entry);
    onClose();
  }, [currentFormDirty, onClone, onClose]);

  function handleSaveTemplate() {
    const name = templateName.trim();
    if (!name) return;
    onSaveTemplate(name);
    setSaving(false);
    setTemplateName("");
    setTemplates(getTemplates());
  }

  function handleDeleteTemplate(id: string) {
    const target = templates.find((t) => t.id === id);
    if (!target) return;

    // Immediate remove with undo
    if (undoEntry) {
      clearTimeout(undoEntry.timer);
      deleteTemplate(undoEntry.template.id); // commit previous pending delete
    }

    setTemplates((prev) => prev.filter((t) => t.id !== id));
    const timer = setTimeout(() => {
      deleteTemplate(id);
      setUndoEntry(null);
    }, 4000);
    setUndoEntry({ template: target, timer });
  }

  function handleUndo() {
    if (!undoEntry) return;
    clearTimeout(undoEntry.timer);
    setTemplates((prev) => {
      const restored = [undoEntry.template, ...prev];
      restored.sort((a, b) => b.createdAt - a.createdAt);
      return restored;
    });
    setUndoEntry(null);
  }

  return (
    <>
      <div
        className="drawer-backdrop"
        data-open={open || undefined}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="drawer-panel"
        data-open={open || undefined}
        role="dialog"
        aria-label="Submission history and templates"
      >
        <div className="drawer-header">
          <div className="drawer-tabs">
            <button
              type="button"
              className={`drawer-tab${tab === "recent" ? " drawer-tab--active" : ""}`}
              onClick={() => setTab("recent")}
            >
              Recent ({counts.recent})
            </button>
            <button
              type="button"
              className={`drawer-tab${tab === "templates" ? " drawer-tab--active" : ""}`}
              onClick={() => setTab("templates")}
            >
              Templates ({counts.templates})
            </button>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="drawer-body">
          {tab === "recent" && (
            history.length === 0 ? (
              <div className="drawer-empty">No submissions yet</div>
            ) : (
              history.map((entry) => {
                const { primary, secondary } = entryPreview(entry.data.formData as Record<string, unknown>);
                return (
                  <div key={entry.id} className="drawer-entry">
                    <div className="drawer-entry-info">
                      <span className="drawer-entry-primary">{primary}</span>
                      <span className="drawer-entry-secondary">
                        {secondary}{secondary ? " · " : ""}{relativeTime(entry.timestamp)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="drawer-entry-action"
                      onClick={() => handleClone(entry)}
                      title="Clone this submission"
                    >
                      Clone
                    </button>
                  </div>
                );
              })
            )
          )}

          {tab === "templates" && (
            <>
              <div className="drawer-template-save">
                {!saving ? (
                  <button
                    type="button"
                    className="drawer-save-btn"
                    onClick={() => setSaving(true)}
                  >
                    + Save Current
                  </button>
                ) : (
                  <div className="drawer-save-input">
                    <input
                      ref={inputRef}
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveTemplate();
                        if (e.key === "Escape") { setSaving(false); setTemplateName(""); }
                      }}
                      placeholder="Template name..."
                      className="input"
                    />
                    <button
                      type="button"
                      className="drawer-save-confirm"
                      onClick={handleSaveTemplate}
                      disabled={!templateName.trim()}
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              {templates.length === 0 && !saving ? (
                <div className="drawer-empty">No templates saved</div>
              ) : (
                templates.map((tpl) => {
                  const { primary, secondary } = entryPreview(tpl.data.formData as Record<string, unknown>);
                  return (
                    <div key={tpl.id} className="drawer-entry">
                      <div className="drawer-entry-info">
                        <span className="drawer-entry-primary">{tpl.name}</span>
                        <span className="drawer-entry-secondary">
                          {primary !== "Untitled" ? primary : secondary}
                        </span>
                      </div>
                      <div className="drawer-entry-actions">
                        <button
                          type="button"
                          className="drawer-entry-action"
                          onClick={() => handleClone(tpl)}
                          title="Load this template"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          className="drawer-entry-action drawer-entry-action--delete"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          title="Delete this template"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {undoEntry && (
          <div className="drawer-toast">
            <span>Template deleted</span>
            <button type="button" className="drawer-toast-undo" onClick={handleUndo}>
              Undo
            </button>
          </div>
        )}
      </div>
    </>
  );
}
