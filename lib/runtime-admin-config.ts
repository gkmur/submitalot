import "server-only";

import { getJsonValue, setJsonValue } from "./server-store";
import { AIRTABLE_FIELD_MAP } from "./constants/airtable";
import {
  BUYER_TYPE_OPTIONS,
  COUNTRY_OPTIONS,
  TAG_PRESET_OPTIONS,
} from "./constants/options";
import type { FormFieldKey } from "./admin-sync";
import type { RuntimeOptionName, RuntimeOptionSets } from "./runtime-option-types";

const RUNTIME_CONFIG_KEY = "submitalot:runtime-admin-config:v1";
const RUNTIME_CONFIG_TTL_MS = 5 * 365 * 24 * 60 * 60 * 1000;

export interface RuntimeAdminConfig {
  version: 1;
  mappingOverrides: Partial<Record<FormFieldKey, string>>;
  optionsOverrides: Partial<RuntimeOptionSets>;
  updatedAt: string;
  lastManualSyncAt?: string;
  lastAutoSyncAt?: string;
}

const DEFAULT_OPTION_SETS: RuntimeOptionSets = {
  TAG_PRESET_OPTIONS,
  BUYER_TYPE_OPTIONS,
  COUNTRY_OPTIONS,
};

function nowIso() {
  return new Date().toISOString();
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function sanitizeMappingOverrides(
  value: unknown
): Partial<Record<FormFieldKey, string>> {
  if (!value || typeof value !== "object") return {};

  const allowedKeys = new Set(Object.keys(AIRTABLE_FIELD_MAP));
  const next: Partial<Record<FormFieldKey, string>> = {};

  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (!allowedKeys.has(rawKey)) continue;
    if (typeof rawValue !== "string") continue;
    const trimmed = rawValue.trim();
    if (!trimmed) continue;
    next[rawKey as FormFieldKey] = trimmed;
  }

  return next;
}

function sanitizeOptionsOverrides(value: unknown): Partial<RuntimeOptionSets> {
  if (!value || typeof value !== "object") return {};

  const next: Partial<RuntimeOptionSets> = {};
  for (const key of Object.keys(DEFAULT_OPTION_SETS) as RuntimeOptionName[]) {
    const maybe = (value as Record<string, unknown>)[key];
    if (!isStringArray(maybe)) continue;
    next[key] = maybe.map((entry) => entry.trim()).filter(Boolean);
  }
  return next;
}

function normalize(raw: unknown): RuntimeAdminConfig {
  if (!raw || typeof raw !== "object") {
    return {
      version: 1,
      mappingOverrides: {},
      optionsOverrides: {},
      updatedAt: nowIso(),
    };
  }

  const value = raw as Partial<RuntimeAdminConfig>;
  const updatedAt =
    typeof value.updatedAt === "string" && !Number.isNaN(Date.parse(value.updatedAt))
      ? value.updatedAt
      : nowIso();

  return {
    version: 1,
    mappingOverrides: sanitizeMappingOverrides(value.mappingOverrides),
    optionsOverrides: sanitizeOptionsOverrides(value.optionsOverrides),
    updatedAt,
    lastManualSyncAt:
      typeof value.lastManualSyncAt === "string" ? value.lastManualSyncAt : undefined,
    lastAutoSyncAt:
      typeof value.lastAutoSyncAt === "string" ? value.lastAutoSyncAt : undefined,
  };
}

function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function buildNextOptionOverrides(
  currentOverrides: Partial<RuntimeOptionSets>,
  updates: Partial<RuntimeOptionSets>
) {
  const next = { ...currentOverrides };
  let changedCount = 0;

  for (const key of Object.keys(DEFAULT_OPTION_SETS) as RuntimeOptionName[]) {
    const incoming = updates[key];
    if (!incoming) continue;

    const normalized = incoming.map((entry) => entry.trim()).filter(Boolean);
    const baseline = DEFAULT_OPTION_SETS[key];
    const currentEffective = currentOverrides[key] ?? baseline;
    const changed = !arraysEqual(currentEffective, normalized);
    if (!changed) continue;

    changedCount += 1;
    if (arraysEqual(normalized, baseline)) {
      delete next[key];
      continue;
    }
    next[key] = normalized;
  }

  return { nextOverrides: next, changedCount };
}

function buildNextMappingOverrides(
  currentOverrides: Partial<Record<FormFieldKey, string>>,
  updates: Partial<Record<FormFieldKey, string>>
) {
  const next = { ...currentOverrides };
  let changedCount = 0;

  const baselineMap = AIRTABLE_FIELD_MAP as Partial<Record<FormFieldKey, string>>;
  const allowedKeys = Object.keys(baselineMap) as FormFieldKey[];
  for (const key of allowedKeys) {
    const incoming = updates[key];
    if (typeof incoming !== "string") continue;
    const normalized = incoming.trim();
    if (!normalized) continue;

    const baseline = baselineMap[key];
    const currentEffective = currentOverrides[key] ?? baseline;
    if (currentEffective === normalized) continue;

    changedCount += 1;
    if (baseline === normalized) {
      delete next[key];
      continue;
    }
    next[key] = normalized;
  }

  return { nextOverrides: next, changedCount };
}

async function persist(config: RuntimeAdminConfig) {
  await setJsonValue(RUNTIME_CONFIG_KEY, config, RUNTIME_CONFIG_TTL_MS);
  return config;
}

export async function getRuntimeAdminConfig() {
  const raw = await getJsonValue<RuntimeAdminConfig>(RUNTIME_CONFIG_KEY);
  return normalize(raw);
}

export async function setRuntimeAdminConfig(config: RuntimeAdminConfig) {
  return persist(normalize(config));
}

export async function updateRuntimeAdminConfig(
  mutate: (current: RuntimeAdminConfig) => RuntimeAdminConfig
) {
  const current = await getRuntimeAdminConfig();
  const next = normalize(mutate(current));
  return persist(next);
}

export async function getEffectiveFieldMap() {
  const runtime = await getRuntimeAdminConfig();
  return {
    ...(AIRTABLE_FIELD_MAP as Partial<Record<FormFieldKey, string>>),
    ...runtime.mappingOverrides,
  };
}

export async function getEffectiveOptionSets(): Promise<RuntimeOptionSets> {
  const runtime = await getRuntimeAdminConfig();
  return {
    TAG_PRESET_OPTIONS:
      runtime.optionsOverrides.TAG_PRESET_OPTIONS ?? DEFAULT_OPTION_SETS.TAG_PRESET_OPTIONS,
    BUYER_TYPE_OPTIONS:
      runtime.optionsOverrides.BUYER_TYPE_OPTIONS ?? DEFAULT_OPTION_SETS.BUYER_TYPE_OPTIONS,
    COUNTRY_OPTIONS:
      runtime.optionsOverrides.COUNTRY_OPTIONS ?? DEFAULT_OPTION_SETS.COUNTRY_OPTIONS,
  };
}

export async function applyRuntimeMappingUpdates(
  updates: Partial<Record<FormFieldKey, string>>
) {
  const current = await getRuntimeAdminConfig();
  const { nextOverrides, changedCount } = buildNextMappingOverrides(
    current.mappingOverrides,
    updates
  );

  const nextConfig: RuntimeAdminConfig = {
    ...current,
    mappingOverrides: nextOverrides,
    updatedAt: nowIso(),
  };
  await persist(nextConfig);
  const nextMap = await getEffectiveFieldMap();
  return { changedCount, nextMap };
}

export async function applyRuntimeOptionUpdates(updates: Partial<RuntimeOptionSets>) {
  const current = await getRuntimeAdminConfig();
  const { nextOverrides, changedCount } = buildNextOptionOverrides(
    current.optionsOverrides,
    updates
  );

  const nextConfig: RuntimeAdminConfig = {
    ...current,
    optionsOverrides: nextOverrides,
    updatedAt: nowIso(),
  };
  await persist(nextConfig);
  const nextOptions = await getEffectiveOptionSets();
  return { changedCount, nextOptions };
}
