"use client";

import { FormSection } from "../FormSection";
import { TextInput } from "../fields/TextInput";
import { TextArea } from "../fields/TextArea";
import { RadioGroup } from "../fields/RadioGroup";
import { SelectDropdown } from "../fields/SelectDropdown";
import {
  PACKAGING_TYPE_OPTIONS,
  INVENTORY_AVAILABILITY_OPTIONS,
  FOB_EXW_OPTIONS,
  LEAD_TIME_INTERVAL_OPTIONS,
} from "@/lib/constants";

export function LogisticsSection() {
  return (
    <FormSection title="Logistics">
      <TextInput name="minimumOrder" label="Minimum Order" required placeholder="e.g. 1400 units or $3k or take-all" />
      <RadioGroup name="packagingType" label="Packaging Type" options={PACKAGING_TYPE_OPTIONS} required />
      <TextArea name="packagingDetails" label="Packaging Details" placeholder="Additional packaging details..." rows={2} />
      <RadioGroup name="inventoryAvailability" label="Inventory Availability" options={INVENTORY_AVAILABILITY_OPTIONS} required />
      <RadioGroup name="fobOrExw" label="FOB or EXW?" options={FOB_EXW_OPTIONS} required />

      <div className="inline-fields">
        <TextInput name="leadTimeNumber" label="Lead Time" type="number" className="number-field" />
        <SelectDropdown name="leadTimeInterval" label="Interval" options={LEAD_TIME_INTERVAL_OPTIONS} />
      </div>
    </FormSection>
  );
}
