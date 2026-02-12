"use client";

import { useFormContext } from "react-hook-form";
import { FormSection } from "../FormSection";
import { TextInput } from "../fields/TextInput";
import { RadioGroup } from "../fields/RadioGroup";
import { FileUpload } from "../fields/FileUpload";
import { INVENTORY_TYPE_OPTIONS } from "@/lib/constants";
import { shouldShowField, getFieldsToClear } from "@/lib/conditional-logic";
import type { ItemizationFormData } from "@/lib/types";

export function PrimaryDetails() {
  const { watch, setValue, resetField } = useFormContext<ItemizationFormData>();
  const formState = watch();

  function handleInventoryTypeChange(value: string) {
    const toClear = getFieldsToClear("inventoryType", value);
    toClear.forEach((field) => resetField(field));
  }

  return (
    <FormSection title="Primary Details">
      <TextInput name="brandPartner" label="Brand Partner" required placeholder="Search brand partner..." />
      <TextInput name="seller" label="Seller" required placeholder="Search seller..." />

      {shouldShowField("newSellerId", formState) && (
        <div className="conditional-enter">
          <TextInput name="newSellerId" label="New Seller ID" required />
        </div>
      )}

      <FileUpload name="inventoryFile" label="Inventory File" required />
      <FileUpload name="additionalFiles" label="Additional Files" />

      <RadioGroup
        name="inventoryType"
        label="Inventory Type"
        options={INVENTORY_TYPE_OPTIONS}
        required
        onChange={handleInventoryTypeChange}
      />
    </FormSection>
  );
}
