export const RUNTIME_OPTION_NAMES = [
  "TAG_PRESET_OPTIONS",
  "BUYER_TYPE_OPTIONS",
  "COUNTRY_OPTIONS",
] as const;

export type RuntimeOptionName = (typeof RUNTIME_OPTION_NAMES)[number];

export type RuntimeOptionSets = Record<RuntimeOptionName, string[]>;
