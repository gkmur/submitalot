"use client";

import { FormSection } from "../FormSection";
import { TextInput } from "../fields/TextInput";

export function LocationSection() {
  return (
    <FormSection title="Location">
      <TextInput name="region" label="Region" required placeholder="e.g. United States" />
      <TextInput name="state" label="State" placeholder="e.g. California" />
      <TextInput name="city" label="City" placeholder="e.g. Los Angeles" />
    </FormSection>
  );
}
