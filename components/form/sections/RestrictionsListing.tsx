"use client";

import { useFormContext } from "react-hook-form";
import { FormSection } from "../FormSection";
import { RadioGroup } from "../fields/RadioGroup";
import { TextInput } from "../fields/TextInput";
import { TextArea } from "../fields/TextArea";
import { Checkbox } from "../fields/Checkbox";
import { LinkedRecordPicker } from "../fields/LinkedRecordPicker";
import { SearchableMultiSelect } from "../fields/SearchableMultiSelect";
import { LISTING_DISAGGREGATION_OPTIONS, BUYER_TYPE_OPTIONS, COUNTRY_OPTIONS } from "@/lib/constants/options";
import { LINKED_RECORD_FIELDS } from "@/lib/linked-records";
import { shouldShowField, getFieldsToClear } from "@/lib/conditional-logic";
import type { ItemizationFormData, LinkedRecord } from "@/lib/types";

interface RestrictionsListingProps {
  onRecordsChange?: (field: string, records: LinkedRecord[]) => void;
  initialRecords?: Record<string, LinkedRecord[]>;
  loadGeneration?: number;
}

export function RestrictionsListing({ onRecordsChange, initialRecords, loadGeneration }: RestrictionsListingProps = {}) {
  const { watch, resetField } = useFormContext<ItemizationFormData>();
  const listingDisaggregation = watch("listingDisaggregation");

  function handleDisaggregationChange(value: string) {
    const toClear = getFieldsToClear("listingDisaggregation", value);
    toClear.forEach((field) => resetField(field));
  }

  const company = LINKED_RECORD_FIELDS.restrictionsCompany!;

  return (
    <FormSection title="Restrictions & Listing">
      <RadioGroup
        name="listingDisaggregation"
        label="Listing Disaggregation"
        options={LISTING_DISAGGREGATION_OPTIONS}
        required
        onChange={handleDisaggregationChange}
      />

      {shouldShowField("customDisaggregation", { listingDisaggregation }) && (
        <div className="conditional-enter">
          <TextInput name="customDisaggregation" label="Custom Disaggregation" required />
        </div>
      )}

      <Checkbox name="stealth" label="Stealth?" />
      <TextArea name="restrictionsString" label="Restrictions" placeholder="Enter any restrictions..." />

      <LinkedRecordPicker
        key={`restrictionsCompany-${loadGeneration ?? 0}`}
        name="restrictionsCompany"
        label="Restrictions (Company)"
        table={company.table}
        displayField={company.displayField}
        mode={company.mode}
        previewFields={company.previewFields}
        sortField={company.sortField}
        sortDirection={company.sortDirection}
        placeholder="Search companies..."
        initialRecords={initialRecords?.restrictionsCompany}
        onRecordsChange={(r) => onRecordsChange?.("restrictionsCompany", r)}
      />

      <SearchableMultiSelect
        name="restrictionsBuyerType"
        label="Restrictions (Buyer Type)"
        options={BUYER_TYPE_OPTIONS}
        pinnedOptions={["Brick and mortar", "Online", "Reseller", "Wholesale", "Distributor"]}
        placeholder="Search buyer types..."
      />
      <SearchableMultiSelect
        name="restrictionsRegion"
        label="Restrictions (Region)"
        options={COUNTRY_OPTIONS}
        pinnedOptions={["United States", "Canada", "United Kingdom", "Germany", "France", "Australia"]}
        placeholder="Search countries..."
      />

      <Checkbox name="p0FireListing" label="P0 Fire Listing?" />
      <TextArea name="notes" label="Notes" placeholder="Additional notes..." />
    </FormSection>
  );
}
