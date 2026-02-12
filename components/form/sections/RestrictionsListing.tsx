"use client";

import { useFormContext } from "react-hook-form";
import { FormSection } from "../FormSection";
import { RadioGroup } from "../fields/RadioGroup";
import { TextInput } from "../fields/TextInput";
import { TextArea } from "../fields/TextArea";
import { Checkbox } from "../fields/Checkbox";
import { LISTING_DISAGGREGATION_OPTIONS } from "@/lib/constants";
import { shouldShowField, getFieldsToClear } from "@/lib/conditional-logic";
import type { ItemizationFormData } from "@/lib/types";

export function RestrictionsListing() {
  const { watch, resetField } = useFormContext<ItemizationFormData>();
  const formState = watch();

  function handleDisaggregationChange(value: string) {
    const toClear = getFieldsToClear("listingDisaggregation", value);
    toClear.forEach((field) => resetField(field));
  }

  return (
    <FormSection title="Restrictions & Listing">
      <RadioGroup
        name="listingDisaggregation"
        label="Listing Disaggregation"
        options={LISTING_DISAGGREGATION_OPTIONS}
        required
        onChange={handleDisaggregationChange}
      />

      {shouldShowField("customDisaggregation", formState) && (
        <div className="conditional-enter">
          <TextInput name="customDisaggregation" label="Custom Disaggregation" required />
        </div>
      )}

      <Checkbox name="stealth" label="Stealth?" />
      <TextArea name="restrictionsString" label="Restrictions" placeholder="Enter any restrictions..." />
      <TextInput name="restrictionsCompany" label="Restrictions (Company)" placeholder="Search companies..." />
      <TextInput name="restrictionsBuyerType" label="Restrictions (Buyer Type)" placeholder="Search buyer types..." />
      <TextInput name="restrictionsRegion" label="Restrictions (Region)" placeholder="Search regions..." />
      <Checkbox name="p0FireListing" label="P0 Fire Listing?" />
      <TextArea name="notes" label="Notes" placeholder="Additional notes..." />
    </FormSection>
  );
}
