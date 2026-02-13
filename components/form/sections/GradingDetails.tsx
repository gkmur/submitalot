"use client";

import { useFormContext } from "react-hook-form";
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
} from "@/lib/constants";
import { shouldShowField } from "@/lib/conditional-logic";
import type { ItemizationFormData } from "@/lib/types";

export function GradingDetails() {
  const { watch } = useFormContext<ItemizationFormData>();
  const inventoryType = watch("inventoryType");

  return (
    <FormSection title="Grading Details">
      <RadioScale name="productAssortment" label="Product Assortment" options={PRODUCT_ASSORTMENT_OPTIONS} required />
      <RadioScale name="inventoryCondition" label="Inventory Condition" options={INVENTORY_CONDITION_OPTIONS} required />
      <StarRating />

      {shouldShowField("pricingStrengthSurplus", { inventoryType }) && (
        <div className="conditional-enter">
          <RadioScale name="pricingStrengthSurplus" label="Pricing Strength (Surplus)" options={PRICING_STRENGTH_SURPLUS_OPTIONS} required />
        </div>
      )}
      {shouldShowField("pricingStrengthWholesale", { inventoryType }) && (
        <div className="conditional-enter">
          <RadioScale name="pricingStrengthWholesale" label="Pricing Strength (Wholesale)" options={PRICING_STRENGTH_WHOLESALE_OPTIONS} required />
        </div>
      )}

      {shouldShowField("brandDemandSurplus", { inventoryType }) && (
        <div className="conditional-enter">
          <RadioScale name="brandDemandSurplus" label="Brand Demand (Surplus)" options={BRAND_DEMAND_SURPLUS_OPTIONS} required />
        </div>
      )}
      {shouldShowField("brandDemandWholesale", { inventoryType }) && (
        <div className="conditional-enter">
          <RadioScale name="brandDemandWholesale" label="Brand Demand (Wholesale)" options={BRAND_DEMAND_WHOLESALE_OPTIONS} required />
        </div>
      )}

      {shouldShowField("locationSurplus", { inventoryType }) && (
        <div className="conditional-enter">
          <RadioScale name="locationSurplus" label="Location (Surplus)" options={LOCATION_SURPLUS_OPTIONS} required />
        </div>
      )}
      {shouldShowField("locationWholesale", { inventoryType }) && (
        <div className="conditional-enter">
          <RadioScale name="locationWholesale" label="Location (Wholesale)" options={LOCATION_WHOLESALE_OPTIONS} required />
        </div>
      )}

      {shouldShowField("restrictionsSurplus", { inventoryType }) && (
        <div className="conditional-enter">
          <RadioScale name="restrictionsSurplus" label="Restrictions (Surplus)" options={RESTRICTIONS_SURPLUS_OPTIONS} required />
        </div>
      )}
      {shouldShowField("restrictionsWholesale", { inventoryType }) && (
        <div className="conditional-enter">
          <RadioScale name="restrictionsWholesale" label="Restrictions (Wholesale)" options={RESTRICTIONS_WHOLESALE_OPTIONS} required />
        </div>
      )}
    </FormSection>
  );
}
