import type { ItemizationFormData, FormFieldName, SectionId, LinkedRecord } from "./types";
import { LINKED_RECORD_FIELDS } from "./linked-records";
import { FORM_DEFAULTS, SECTION_FIELD_MAP } from "./constants/form";

// ─── Types ───────────────────────────────────────────────────────────────────

export type LinkedRecordFieldName = keyof typeof LINKED_RECORD_FIELDS;

export interface StoredSubmission {
  version: 1;
  formData: Partial<ItemizationFormData>;
  linkedRecords: Partial<Record<LinkedRecordFieldName, LinkedRecord[]>>;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  data: StoredSubmission;
}

export interface Template {
  id: string;
  name: string;
  createdAt: number;
  data: StoredSubmission;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const HISTORY_KEY = "submitalot:history";
const TEMPLATES_KEY = "submitalot:templates";
const MAX_HISTORY = 20;
const MAX_TEMPLATES = 50;
const FILE_FIELDS: FormFieldName[] = ["inventoryFile", "additionalFiles"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _storageAvailable: boolean | null = null;

export function isStorageAvailable(): boolean {
  if (_storageAvailable !== null) return _storageAvailable;
  try {
    const key = "__submitalot_test__";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    _storageAvailable = true;
  } catch {
    _storageAvailable = false;
  }
  return _storageAvailable;
}

function stripFiles(data: Partial<ItemizationFormData>): Partial<ItemizationFormData> {
  const cleaned = { ...data };
  for (const f of FILE_FIELDS) {
    delete (cleaned as Record<string, unknown>)[f];
  }
  return cleaned;
}

function stripLinkedRecordMetadata(
  records: Partial<Record<LinkedRecordFieldName, LinkedRecord[]>>
): Partial<Record<LinkedRecordFieldName, LinkedRecord[]>> {
  const cleaned: Partial<Record<LinkedRecordFieldName, LinkedRecord[]>> = {};
  for (const [key, arr] of Object.entries(records)) {
    if (arr) {
      cleaned[key as LinkedRecordFieldName] = arr.map(({ id, name }) => ({ id, name }));
    }
  }
  return cleaned;
}

function buildStored(
  data: Partial<ItemizationFormData>,
  linkedRecords: Partial<Record<LinkedRecordFieldName, LinkedRecord[]>>
): StoredSubmission {
  return {
    version: 1,
    formData: stripFiles(data),
    linkedRecords: stripLinkedRecordMetadata(linkedRecords),
  };
}

function isValidEntry(obj: unknown): obj is HistoryEntry {
  return (
    typeof obj === "object" && obj !== null &&
    "id" in obj && "timestamp" in obj && "data" in obj &&
    typeof (obj as HistoryEntry).data === "object" &&
    (obj as HistoryEntry).data?.version === 1
  );
}

function isValidTemplate(obj: unknown): obj is Template {
  return (
    typeof obj === "object" && obj !== null &&
    "id" in obj && "name" in obj && "createdAt" in obj && "data" in obj &&
    typeof (obj as Template).data === "object" &&
    (obj as Template).data?.version === 1
  );
}

function safeParseArray<T>(key: string, validator: (obj: unknown) => obj is T): T[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(validator);
  } catch {
    return [];
  }
}

// ─── History ─────────────────────────────────────────────────────────────────

export function saveHistory(
  data: Partial<ItemizationFormData>,
  linkedRecords: Partial<Record<LinkedRecordFieldName, LinkedRecord[]>>
): boolean {
  if (!isStorageAvailable()) return false;
  try {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      data: buildStored(data, linkedRecords),
    };
    const history = getHistory();
    history.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
    return true;
  } catch {
    return false;
  }
}

export function getHistory(): HistoryEntry[] {
  return safeParseArray(HISTORY_KEY, isValidEntry);
}

// ─── Templates ───────────────────────────────────────────────────────────────

export function saveTemplate(
  name: string,
  data: Partial<ItemizationFormData>,
  linkedRecords: Partial<Record<LinkedRecordFieldName, LinkedRecord[]>>
): boolean {
  if (!isStorageAvailable()) return false;
  try {
    const template: Template = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      data: buildStored(data, linkedRecords),
    };
    const templates = getTemplates();
    templates.unshift(template);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates.slice(0, MAX_TEMPLATES)));
    return true;
  } catch {
    return false;
  }
}

export function getTemplates(): Template[] {
  return safeParseArray(TEMPLATES_KEY, isValidTemplate);
}

export function deleteTemplate(id: string): boolean {
  if (!isStorageAvailable()) return false;
  try {
    const templates = getTemplates().filter((t) => t.id !== id);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    return true;
  } catch {
    return false;
  }
}

// ─── Carry Forward ───────────────────────────────────────────────────────────

export function buildCarryForwardValues(
  lastData: StoredSubmission,
  keptSections: SectionId[],
  sectionFieldMap: typeof SECTION_FIELD_MAP = SECTION_FIELD_MAP
): Partial<ItemizationFormData> {
  const result: Partial<ItemizationFormData> = { ...FORM_DEFAULTS };
  const kept = new Set<string>(keptSections.flatMap((s) => sectionFieldMap[s]));
  for (const [key, value] of Object.entries(lastData.formData)) {
    if (kept.has(key)) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}
