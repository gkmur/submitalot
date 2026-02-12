"use client";

import { FormSection } from "../FormSection";
import { RadioGroup } from "../fields/RadioGroup";
import { MultiSelect } from "../fields/MultiSelect";
import { TextInput } from "../fields/TextInput";
import { TextArea } from "../fields/TextArea";
import {
  CATEGORY_GROUP_OPTIONS,
  INVENTORY_EXCLUSIVITY_OPTIONS,
  PAPERWORK_OPTIONS,
} from "@/lib/constants";

export function InventoryDetails() {
  return (
    <FormSection title="Inventory Details">
      <MultiSelect name="categoryGroups" label="Category Groups" options={CATEGORY_GROUP_OPTIONS} required />
      <RadioGroup name="inventoryExclusivity" label="Inventory Exclusivity" options={INVENTORY_EXCLUSIVITY_OPTIONS} required />
      <RadioGroup name="paperwork" label="Paperwork" options={PAPERWORK_OPTIONS} required />
      <TextInput name="tagPresets" label="Tag Presets" placeholder="Search tags..." />
      <TextInput name="allTags" label="All Tags" placeholder="Add tags..." />
      <TextArea name="inventoryNotes" label="Inventory Notes" placeholder="Additional notes about this inventory..." />
    </FormSection>
  );
}
