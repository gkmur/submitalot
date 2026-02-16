"use client";

import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { FormSection } from "../FormSection";
import { RadioScale } from "../fields/RadioScale";
import { StarRating } from "../fields/StarRating";
import {
  PRODUCT_ASSORTMENT_OPTIONS,
  INVENTORY_CONDITION_OPTIONS,
  PRICING_STRENGTH_SURPLUS_OPTIONS,
  PRICING_STRENGTH_WHOLESALE_OPTIONS,
  BRAND_DEMAND_SURPLUS_OPTIONS,
  BRAND_DEMAND_WHOLESALE_OPTIONS,
  LOCATION_SURPLUS_OPTIONS,
  LOCATION_WHOLESALE_OPTIONS,
  RESTRICTIONS_SURPLUS_OPTIONS,
  RESTRICTIONS_WHOLESALE_OPTIONS,
} from "@/lib/constants/options";
import { shouldShowField } from "@/lib/conditional-logic";
import type { ItemizationFormData, FormFieldName } from "@/lib/types";
import type { RadioOption } from "@/lib/constants/shared";

type ScaleFieldName =
  | "productAssortment"
  | "inventoryCondition"
  | "pricingStrengthSurplus"
  | "pricingStrengthWholesale"
  | "brandDemandSurplus"
  | "brandDemandWholesale"
  | "locationSurplus"
  | "locationWholesale"
  | "restrictionsSurplus"
  | "restrictionsWholesale";

interface ScaleConfig {
  name: ScaleFieldName;
  label: string;
  options: RadioOption[];
  helperText?: string;
  legendLow: string;
  legendHigh: string;
}

function scoreFromValue(value: string | number | undefined): string {
  if (typeof value === "number") return value > 0 ? `${value}/5` : "—";
  if (typeof value === "string") {
    const match = /^([1-5]):/.exec(value);
    return match ? `${match[1]}/5` : "—";
  }
  return "—";
}

function isFilled(value: unknown): boolean {
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return false;
}

const CORE_SCALES: ScaleConfig[] = [
  {
    name: "productAssortment",
    label: "Product Assortment",
    options: PRODUCT_ASSORTMENT_OPTIONS,
    legendLow: "1 = least core",
    legendHigh: "5 = most core",
  },
  {
    name: "inventoryCondition",
    label: "Inventory Condition",
    options: INVENTORY_CONDITION_OPTIONS,
    legendLow: "1 = major damage",
    legendHigh: "5 = brand new",
  },
];

const SURPLUS_SCALES: ScaleConfig[] = [
  {
    name: "pricingStrengthSurplus",
    label: "Pricing Strength",
    options: PRICING_STRENGTH_SURPLUS_OPTIONS,
    helperText: "How much discount off MSRP is the seller offering?",
    legendLow: "1 = weak",
    legendHigh: "5 = strong",
  },
  {
    name: "brandDemandSurplus",
    label: "Brand Demand",
    options: BRAND_DEMAND_SURPLUS_OPTIONS,
    helperText: "Consider brand awareness, demand, and market pull.",
    legendLow: "1 = weak demand",
    legendHigh: "5 = strong demand",
  },
  {
    name: "locationSurplus",
    label: "Location",
    options: LOCATION_SURPLUS_OPTIONS,
    helperText: "How favorable is location and sellability for this lot?",
    legendLow: "1 = restrictive",
    legendHigh: "5 = flexible",
  },
  {
    name: "restrictionsSurplus",
    label: "Restrictions",
    options: RESTRICTIONS_SURPLUS_OPTIONS,
    helperText: "How flexible is the seller about where inventory can be sold?",
    legendLow: "1 = very restrictive",
    legendHigh: "5 = no restrictions",
  },
];

const WHOLESALE_SCALES: ScaleConfig[] = [
  {
    name: "pricingStrengthWholesale",
    label: "Pricing Strength",
    options: PRICING_STRENGTH_WHOLESALE_OPTIONS,
    helperText: "How competitive is pricing after Ghost's markup?",
    legendLow: "1 = weak",
    legendHigh: "5 = strong",
  },
  {
    name: "brandDemandWholesale",
    label: "Brand Demand",
    options: BRAND_DEMAND_WHOLESALE_OPTIONS,
    helperText: "Consider brand awareness, demand, and market pull.",
    legendLow: "1 = weak demand",
    legendHigh: "5 = strong demand",
  },
  {
    name: "locationWholesale",
    label: "Location",
    options: LOCATION_WHOLESALE_OPTIONS,
    helperText: "How favorable is location and sellability for this lot?",
    legendLow: "1 = restrictive",
    legendHigh: "5 = flexible",
  },
  {
    name: "restrictionsWholesale",
    label: "Restrictions",
    options: RESTRICTIONS_WHOLESALE_OPTIONS,
    helperText: "How flexible is the seller about where inventory can be sold?",
    legendLow: "1 = very restrictive",
    legendHigh: "5 = no restrictions",
  },
];

const GRADING_WATCH_FIELDS: FormFieldName[] = [
  "inventoryType",
  "productAssortment",
  "inventoryCondition",
  "overallListingRating",
  "pricingStrengthSurplus",
  "pricingStrengthWholesale",
  "brandDemandSurplus",
  "brandDemandWholesale",
  "locationSurplus",
  "locationWholesale",
  "restrictionsSurplus",
  "restrictionsWholesale",
];

export function GradingDetails() {
  const { control } = useFormContext<ItemizationFormData>();
  const watchedValues = useWatch({
    control,
    name: GRADING_WATCH_FIELDS,
  });

  const [
    inventoryType,
    productAssortment,
    inventoryCondition,
    overallListingRating,
    pricingStrengthSurplus,
    pricingStrengthWholesale,
    brandDemandSurplus,
    brandDemandWholesale,
    locationSurplus,
    locationWholesale,
    restrictionsSurplus,
    restrictionsWholesale,
  ] = watchedValues as [
    ItemizationFormData["inventoryType"] | undefined,
    ItemizationFormData["productAssortment"] | undefined,
    ItemizationFormData["inventoryCondition"] | undefined,
    ItemizationFormData["overallListingRating"] | undefined,
    ItemizationFormData["pricingStrengthSurplus"] | undefined,
    ItemizationFormData["pricingStrengthWholesale"] | undefined,
    ItemizationFormData["brandDemandSurplus"] | undefined,
    ItemizationFormData["brandDemandWholesale"] | undefined,
    ItemizationFormData["locationSurplus"] | undefined,
    ItemizationFormData["locationWholesale"] | undefined,
    ItemizationFormData["restrictionsSurplus"] | undefined,
    ItemizationFormData["restrictionsWholesale"] | undefined
  ];

  const fieldValues = useMemo<Partial<Record<FormFieldName, string | number | undefined>>>(
    () => ({
      productAssortment,
      inventoryCondition,
      overallListingRating,
      pricingStrengthSurplus,
      pricingStrengthWholesale,
      brandDemandSurplus,
      brandDemandWholesale,
      locationSurplus,
      locationWholesale,
      restrictionsSurplus,
      restrictionsWholesale,
    }),
    [
      productAssortment,
      inventoryCondition,
      overallListingRating,
      pricingStrengthSurplus,
      pricingStrengthWholesale,
      brandDemandSurplus,
      brandDemandWholesale,
      locationSurplus,
      locationWholesale,
      restrictionsSurplus,
      restrictionsWholesale,
    ]
  );

  const variantScales = useMemo(() => {
    if (inventoryType === "Discount") return SURPLUS_SCALES;
    if (inventoryType === "Wholesale") return WHOLESALE_SCALES;
    return [] as ScaleConfig[];
  }, [inventoryType]);

  const requiredVisibleFields = useMemo<FormFieldName[]>(
    () => [
      "productAssortment",
      "inventoryCondition",
      "overallListingRating",
      ...variantScales.map((s) => s.name),
    ],
    [variantScales]
  );

  const completedCount = useMemo(
    () => requiredVisibleFields.filter((field) => isFilled(fieldValues[field])).length,
    [requiredVisibleFields, fieldValues]
  );

  const summaryItems = useMemo<{ key: string; label: string; score: string }[]>(
    () => [
      { key: "assortment", label: "Assortment", score: scoreFromValue(productAssortment) },
      { key: "condition", label: "Condition", score: scoreFromValue(inventoryCondition) },
      { key: "overall", label: "Overall", score: scoreFromValue(overallListingRating) },
      ...variantScales.map((scale) => ({
        key: scale.name,
        label: scale.label,
        score: scoreFromValue(fieldValues[scale.name]),
      })),
    ],
    [productAssortment, inventoryCondition, overallListingRating, variantScales, fieldValues]
  );

  return (
    <FormSection title="Grading Details">
      <div className="grading-progress">
        <span>{completedCount} of {requiredVisibleFields.length} required fields complete</span>
      </div>

      <div className="grading-summary">
        {summaryItems.map((item) => (
          <div className="grading-summary-item" key={item.key}>
            <span className="grading-summary-label">{item.label}</span>
            <strong className="grading-summary-value">{item.score}</strong>
          </div>
        ))}
      </div>

      <div className="grading-group">
        <h3 className="grading-group-title">Core Grading</h3>
        {CORE_SCALES.map((scale) => (
          <RadioScale
            key={scale.name}
            name={scale.name}
            label={scale.label}
            options={scale.options}
            required
            legendLow={scale.legendLow}
            legendHigh={scale.legendHigh}
            wrapLabels
            showSelectedDefinition
          />
        ))}
        <StarRating />
      </div>

      <div className="grading-group">
        <h3 className="grading-group-title">Inventory-Type Criteria</h3>
        {inventoryType ? (
          <div className="grading-context-banner">
            Using <strong>{inventoryType}</strong> criteria for the additional grading questions.
          </div>
        ) : (
          <div className="grading-context-banner grading-context-banner--muted">
            Select <strong>Inventory Type</strong> in Primary Details to unlock these questions.
          </div>
        )}
      </div>

      {shouldShowField("pricingStrengthSurplus", { inventoryType }) && (
        <div className="conditional-enter">
          <RadioScale
            name="pricingStrengthSurplus"
            label="Pricing Strength"
            options={PRICING_STRENGTH_SURPLUS_OPTIONS}
            helperText="How much discount off MSRP is the seller offering?"
            required
            legendLow="1 = weak"
            legendHigh="5 = strong"
            wrapLabels
            showSelectedDefinition
          />
        </div>
      )}
      {shouldShowField("pricingStrengthWholesale", { inventoryType }) && (
        <div className="conditional-enter">
          <RadioScale
            name="pricingStrengthWholesale"
            label="Pricing Strength"
            options={PRICING_STRENGTH_WHOLESALE_OPTIONS}
            helperText="How competitive is pricing after Ghost's markup?"
            required
            legendLow="1 = weak"
            legendHigh="5 = strong"
            wrapLabels
            showSelectedDefinition
          />
        </div>
      )}

      {shouldShowField("brandDemandSurplus", { inventoryType }) && (
        <div className="conditional-enter">
          <RadioScale
            name="brandDemandSurplus"
            label="Brand Demand"
            options={BRAND_DEMAND_SURPLUS_OPTIONS}
            helperText="Consider brand awareness, demand, and market pull."
            required
            legendLow="1 = weak demand"
            legendHigh="5 = strong demand"
            wrapLabels
            showSelectedDefinition
          />
        </div>
      )}
      {shouldShowField("brandDemandWholesale", { inventoryType }) && (
        <div className="conditional-enter">
          <RadioScale
            name="brandDemandWholesale"
            label="Brand Demand"
            options={BRAND_DEMAND_WHOLESALE_OPTIONS}
            helperText="Consider brand awareness, demand, and market pull."
            required
            legendLow="1 = weak demand"
            legendHigh="5 = strong demand"
            wrapLabels
            showSelectedDefinition
          />
        </div>
      )}

      {shouldShowField("locationSurplus", { inventoryType }) && (
        <div className="conditional-enter">
          <RadioScale
            name="locationSurplus"
            label="Location"
            options={LOCATION_SURPLUS_OPTIONS}
            helperText="How favorable is location and sellability for this lot?"
            required
            legendLow="1 = restrictive"
            legendHigh="5 = flexible"
            wrapLabels
            showSelectedDefinition
          />
        </div>
      )}
      {shouldShowField("locationWholesale", { inventoryType }) && (
        <div className="conditional-enter">
          <RadioScale
            name="locationWholesale"
            label="Location"
            options={LOCATION_WHOLESALE_OPTIONS}
            helperText="How favorable is location and sellability for this lot?"
            required
            legendLow="1 = restrictive"
            legendHigh="5 = flexible"
            wrapLabels
            showSelectedDefinition
          />
        </div>
      )}

      {shouldShowField("restrictionsSurplus", { inventoryType }) && (
        <div className="conditional-enter">
          <RadioScale
            name="restrictionsSurplus"
            label="Restrictions"
            options={RESTRICTIONS_SURPLUS_OPTIONS}
            helperText="How flexible is the seller about where inventory can be sold?"
            required
            legendLow="1 = very restrictive"
            legendHigh="5 = no restrictions"
            wrapLabels
            showSelectedDefinition
          />
        </div>
      )}
      {shouldShowField("restrictionsWholesale", { inventoryType }) && (
        <div className="conditional-enter">
          <RadioScale
            name="restrictionsWholesale"
            label="Restrictions"
            options={RESTRICTIONS_WHOLESALE_OPTIONS}
            helperText="How flexible is the seller about where inventory can be sold?"
            required
            legendLow="1 = very restrictive"
            legendHigh="5 = no restrictions"
            wrapLabels
            showSelectedDefinition
          />
        </div>
      )}
    </FormSection>
  );
}
