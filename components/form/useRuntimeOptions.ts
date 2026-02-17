"use client";

import { useEffect, useState } from "react";
import {
  BUYER_TYPE_OPTIONS,
  COUNTRY_OPTIONS,
  TAG_PRESET_OPTIONS,
} from "@/lib/constants/options";
import type { RuntimeOptionSets } from "@/lib/runtime-option-types";

interface RuntimeOptionsResponse {
  options?: Partial<RuntimeOptionSets>;
}

const DEFAULT_OPTIONS: RuntimeOptionSets = {
  TAG_PRESET_OPTIONS,
  BUYER_TYPE_OPTIONS,
  COUNTRY_OPTIONS,
};

declare global {
  // eslint-disable-next-line no-var
  var __submitalotRuntimeOptionsCache: RuntimeOptionSets | undefined;
  // eslint-disable-next-line no-var
  var __submitalotRuntimeOptionsInflight:
    | Promise<RuntimeOptionSets>
    | undefined;
}

function mergeRuntimeOptions(
  maybe: Partial<RuntimeOptionSets> | undefined
): RuntimeOptionSets {
  return {
    TAG_PRESET_OPTIONS:
      Array.isArray(maybe?.TAG_PRESET_OPTIONS) &&
      maybe.TAG_PRESET_OPTIONS.length > 0
        ? maybe.TAG_PRESET_OPTIONS
        : DEFAULT_OPTIONS.TAG_PRESET_OPTIONS,
    BUYER_TYPE_OPTIONS:
      Array.isArray(maybe?.BUYER_TYPE_OPTIONS) &&
      maybe.BUYER_TYPE_OPTIONS.length > 0
        ? maybe.BUYER_TYPE_OPTIONS
        : DEFAULT_OPTIONS.BUYER_TYPE_OPTIONS,
    COUNTRY_OPTIONS:
      Array.isArray(maybe?.COUNTRY_OPTIONS) && maybe.COUNTRY_OPTIONS.length > 0
        ? maybe.COUNTRY_OPTIONS
        : DEFAULT_OPTIONS.COUNTRY_OPTIONS,
  };
}

async function fetchRuntimeOptions() {
  const res = await fetch("/api/form/runtime-options", {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Runtime options fetch failed (${res.status})`);
  }
  const data = (await res.json()) as RuntimeOptionsResponse;
  return mergeRuntimeOptions(data.options);
}

function getCachedOptions() {
  return globalThis.__submitalotRuntimeOptionsCache;
}

function setCachedOptions(options: RuntimeOptionSets) {
  globalThis.__submitalotRuntimeOptionsCache = options;
}

function getInflight() {
  return globalThis.__submitalotRuntimeOptionsInflight;
}

function setInflight(
  value: Promise<RuntimeOptionSets> | undefined
) {
  globalThis.__submitalotRuntimeOptionsInflight = value;
}

export function useRuntimeOptions() {
  const [options, setOptions] = useState<RuntimeOptionSets>(
    getCachedOptions() ?? DEFAULT_OPTIONS
  );

  useEffect(() => {
    let active = true;

    const cached = getCachedOptions();
    if (cached) {
      setOptions(cached);
      return () => {
        active = false;
      };
    }

    if (!getInflight()) {
      setInflight(
        fetchRuntimeOptions()
          .then((loaded) => {
            setCachedOptions(loaded);
            return loaded;
          })
          .finally(() => setInflight(undefined))
      );
    }

    getInflight()
      ?.then((loaded) => {
        if (active) setOptions(loaded);
      })
      .catch(() => {
        if (active) setOptions(DEFAULT_OPTIONS);
      });

    return () => {
      active = false;
    };
  }, []);

  return options;
}
