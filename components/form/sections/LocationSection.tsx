"use client";

import { FormSection } from "../FormSection";
import { SelectDropdown } from "../fields/SelectDropdown";
import { TextInput } from "../fields/TextInput";
import { COUNTRY_OPTIONS, US_STATE_OPTIONS } from "@/lib/constants";

export function LocationSection() {
  return (
    <FormSection title="Location">
      <SelectDropdown name="region" label="Region" options={COUNTRY_OPTIONS} required />
      <SelectDropdown name="state" label="State" options={US_STATE_OPTIONS} placeholder="Select state..." />
      <TextInput name="city" label="City" placeholder="e.g. Los Angeles" />
    </FormSection>
  );
}
