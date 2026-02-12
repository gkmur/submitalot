"use client";

import { useFormContext } from "react-hook-form";
import { FormSection } from "../FormSection";
import { RadioGroup } from "../fields/RadioGroup";
import { TextInput } from "../fields/TextInput";
import { TextArea } from "../fields/TextArea";
import { Checkbox } from "../fields/Checkbox";
import { LinkedRecordPicker } from "../fields/LinkedRecordPicker";
import { LISTING_DISAGGREGATION_OPTIONS } from "@/lib/constants";
import { LINKED_RECORD_FIELDS } from "@/lib/linked-records";
import { shouldShowField, getFieldsToClear } from "@/lib/conditional-logic";
import type { ItemizationFormData } from "@/lib/types";

export function RestrictionsListing() {
  const { watch, resetField } = useFormContext<ItemizationFormData>();
  const formState = watch();

  function handleDisaggregationChange(value: string) {
    const toClear = getFieldsToClear("listingDisaggregation", value);
    toClear.forEach((field) => resetField(field));
  }

  const company = LINKED_RECORD_FIELDS.restrictionsCompany!;
  const buyerType = LINKED_RECORD_FIELDS.restrictionsBuyerType!;
  const region = LINKED_RECORD_FIELDS.restrictionsRegion!;

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

      <LinkedRecordPicker
        name="restrictionsCompany"
        label="Restrictions (Company)"
        table={company.table}
        displayField={company.displayField}
        mode={company.mode}
        placeholder="Search companies..."
      />

      <LinkedRecordPicker
        name="restrictionsBuyerType"
        label="Restrictions (Buyer Type)"
        table={buyerType.table}
        displayField={buyerType.displayField}
        mode={buyerType.mode}
        placeholder="Search buyer types..."
      />

      <LinkedRecordPicker
        name="restrictionsRegion"
        label="Restrictions (Region)"
        table={region.table}
        displayField={region.displayField}
        mode={region.mode}
        placeholder="Search regions..."
      />

      <Checkbox name="p0FireListing" label="P0 Fire Listing?" />
      <TextArea name="notes" label="Notes" placeholder="Additional notes..." />
    </FormSection>
  );
}
