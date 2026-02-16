"use client";

import { FormSection } from "../FormSection";
import { SearchableMultiSelect } from "../fields/SearchableMultiSelect";
import { SelectDropdown } from "../fields/SelectDropdown";
import { TextInput } from "../fields/TextInput";
import { COUNTRY_OPTIONS, US_STATE_OPTIONS } from "@/lib/constants/options";

export function LocationSection() {
  return (
    <FormSection title="Location">
      <SearchableMultiSelect
        name="region"
        label="Region"
        options={COUNTRY_OPTIONS}
        pinnedOptions={["United States", "Canada", "United Kingdom", "Germany"]}
        mode="single"
        required
        placeholder="Search countries..."
      />
      <SelectDropdown name="state" label="State" options={US_STATE_OPTIONS} placeholder="Select state..." />
      <TextInput name="city" label="City" placeholder="e.g. Los Angeles" />
    </FormSection>
  );
}
