"use client";

import { FormSection } from "../FormSection";
import { RadioGroup } from "../fields/RadioGroup";
import { ITEMIZATION_TYPE_OPTIONS } from "@/lib/constants";

export function QualificationSection() {
  return (
    <FormSection title="Qualification">
      <RadioGroup name="itemizationType" label="Itemization Type" options={ITEMIZATION_TYPE_OPTIONS} required />
    </FormSection>
  );
}
