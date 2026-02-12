"use client";

import { useFormContext } from "react-hook-form";
import { FormSection } from "../FormSection";
import { TextInput } from "../fields/TextInput";
import { RadioGroup } from "../fields/RadioGroup";
import { FileUpload } from "../fields/FileUpload";
import { LinkedRecordPicker } from "../fields/LinkedRecordPicker";
import { INVENTORY_TYPE_OPTIONS } from "@/lib/constants";
import { LINKED_RECORD_FIELDS } from "@/lib/linked-records";
import { shouldShowField, getFieldsToClear } from "@/lib/conditional-logic";
import type { ItemizationFormData } from "@/lib/types";

export function PrimaryDetails() {
  const { watch, resetField } = useFormContext<ItemizationFormData>();
  const formState = watch();

  function handleInventoryTypeChange(value: string) {
    const toClear = getFieldsToClear("inventoryType", value);
    toClear.forEach((field) => resetField(field));
  }

  const bp = LINKED_RECORD_FIELDS.brandPartner!;
  const seller = LINKED_RECORD_FIELDS.seller!;

  return (
    <FormSection title="Primary Details">
      <LinkedRecordPicker
        name="brandPartner"
        label="Brand Partner"
        table={bp.table}
        displayField={bp.displayField}
        mode={bp.mode}
        required
        placeholder="Search brand partner..."
      />

      <LinkedRecordPicker
        name="seller"
        label="Seller"
        table={seller.table}
        displayField={seller.displayField}
        mode={seller.mode}
        required
        placeholder="Search seller..."
        onChange={(value) => {
          if (value !== "NEW SELLER - GHOST TEMP") {
            const toClear = getFieldsToClear("seller", value);
            toClear.forEach((field) => resetField(field));
          }
        }}
      />

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
