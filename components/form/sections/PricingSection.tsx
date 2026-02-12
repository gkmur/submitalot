"use client";

import { useFormContext } from "react-hook-form";
import { FormSection } from "../FormSection";
import { TextInput } from "../fields/TextInput";
import { RadioGroup } from "../fields/RadioGroup";
import { SelectDropdown } from "../fields/SelectDropdown";
import {
  CURRENCY_TYPE_OPTIONS,
  INLAND_FREIGHT_OPTIONS,
  PRICE_COLUMNS_OPTIONS,
  FLAT_OR_REFERENCE_OPTIONS,
  INCREASE_DECREASE_OPTIONS,
} from "@/lib/constants";
import { shouldShowField, getFieldsToClear } from "@/lib/conditional-logic";
import type { ItemizationFormData } from "@/lib/types";

export function PricingSection() {
  const { watch, resetField } = useFormContext<ItemizationFormData>();
  const formState = watch();

  function handlePriceColumnsChange(value: string) {
    const toClear = getFieldsToClear("priceColumns", value);
    toClear.forEach((field) => resetField(field));
  }

  function handleFlatOrReferenceChange(value: string) {
    const toClear = getFieldsToClear("flatOrReference", value);
    toClear.forEach((field) => resetField(field));
  }

  return (
    <FormSection title="Pricing">
      <SelectDropdown name="currencyType" label="Currency Type" options={CURRENCY_TYPE_OPTIONS} required />
      <RadioGroup name="inlandFreight" label="Does this lot incur inland freight?" options={INLAND_FREIGHT_OPTIONS} required />
      <TextInput name="marginTakeRate" label="Margin % (Take Rate)" type="number" required />

      <RadioGroup
        name="priceColumns"
        label="Price Columns"
        options={PRICE_COLUMNS_OPTIONS}
        required
        onChange={handlePriceColumnsChange}
      />

      {shouldShowField("sellerPriceColumn", formState) && (
        <div className="conditional-enter">
          <TextInput name="sellerPriceColumn" label="Seller Price Column" required placeholder="Header name..." />
        </div>
      )}

      {shouldShowField("buyerPriceColumn", formState) && (
        <div className="conditional-enter">
          <TextInput name="buyerPriceColumn" label="Buyer Price Column" required placeholder="Header name..." />
        </div>
      )}

      {shouldShowField("flatOrReference", formState) && (
        <div className="conditional-enter">
          <RadioGroup
            name="flatOrReference"
            label="Flat Item Price or Reference?"
            options={FLAT_OR_REFERENCE_OPTIONS.map((v) => ({ value: v, label: v }))}
            required
            onChange={handleFlatOrReferenceChange}
          />
        </div>
      )}

      {shouldShowField("referencePriceColumn", formState) && (
        <div className="conditional-enter">
          <TextInput name="referencePriceColumn" label="Reference Price Column" required placeholder="Header name..." />
        </div>
      )}

      {shouldShowField("increaseOrDecrease", formState) && (
        <div className="conditional-enter">
          <RadioGroup
            name="increaseOrDecrease"
            label="Increase or Decrease?"
            options={INCREASE_DECREASE_OPTIONS}
            required
          />
        </div>
      )}

      <TextInput name="maxPercentOffAsking" label="Max Percent Off Asking" type="number" required />
    </FormSection>
  );
}
