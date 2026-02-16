"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { FormSection } from "../FormSection";
import { TextInput } from "../fields/TextInput";
import { RadioGroup } from "../fields/RadioGroup";
import { FileUpload } from "../fields/FileUpload";
import { LinkedRecordPicker } from "../fields/LinkedRecordPicker";
import { INVENTORY_TYPE_OPTIONS } from "@/lib/constants/options";
import { LINKED_RECORD_FIELDS } from "@/lib/linked-records";
import { shouldShowField, getFieldsToClear } from "@/lib/conditional-logic";
import type { ItemizationFormData, LinkedRecord } from "@/lib/types";

interface PrimaryDetailsProps {
  onRecordsChange?: (field: string, records: LinkedRecord[]) => void;
  initialRecords?: Record<string, LinkedRecord[]>;
  loadGeneration?: number;
}

export function PrimaryDetails({ onRecordsChange, initialRecords, loadGeneration }: PrimaryDetailsProps = {}) {
  const { resetField } = useFormContext<ItemizationFormData>();
  const [selectedSellerName, setSelectedSellerName] = useState(
    initialRecords?.seller?.[0]?.name ?? ""
  );

  useEffect(() => {
    setSelectedSellerName(initialRecords?.seller?.[0]?.name ?? "");
  }, [initialRecords?.seller, loadGeneration]);

  function handleInventoryTypeChange(value: string) {
    const toClear = getFieldsToClear("inventoryType", value);
    toClear.forEach((field) => resetField(field));
  }

  const bp = LINKED_RECORD_FIELDS.brandPartner!;
  const sellerConfig = LINKED_RECORD_FIELDS.seller!;

  return (
    <FormSection title="Primary Details">
      <LinkedRecordPicker
        key={`brandPartner-${loadGeneration ?? 0}`}
        name="brandPartner"
        label="Brand Partner"
        table={bp.table}
        displayField={bp.displayField}
        mode={bp.mode}
        previewFields={bp.previewFields}
        sortField={bp.sortField}
        sortDirection={bp.sortDirection}
        required
        placeholder="Search brand partner..."
        initialRecords={initialRecords?.brandPartner}
        onRecordsChange={(r) => onRecordsChange?.("brandPartner", r)}
      />

      <LinkedRecordPicker
        key={`seller-${loadGeneration ?? 0}`}
        name="seller"
        label="Seller"
        table={sellerConfig.table}
        displayField={sellerConfig.displayField}
        mode={sellerConfig.mode}
        previewFields={sellerConfig.previewFields}
        sortField={sellerConfig.sortField}
        sortDirection={sellerConfig.sortDirection}
        required
        placeholder="Search seller..."
        initialRecords={initialRecords?.seller}
        onRecordsChange={(r) => onRecordsChange?.("seller", r)}
        onSelectRecord={(record) => {
          const sellerName = record?.name ?? "";
          setSelectedSellerName(sellerName);
          if (sellerName !== "NEW SELLER - GHOST TEMP") {
            const toClear = getFieldsToClear("seller", sellerName);
            toClear.forEach((field) => resetField(field));
          }
        }}
      />

      {shouldShowField("newSellerId", { seller: selectedSellerName }) && (
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
