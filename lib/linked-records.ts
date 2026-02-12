import type { FormFieldName } from "./types";

export interface LinkedRecordConfig {
  table: string;
  displayField: string;
  mode: "single" | "multi";
}

export const LINKED_RECORD_FIELDS: Partial<Record<FormFieldName, LinkedRecordConfig>> = {
  brandPartner: { table: "Admins", displayField: "Name", mode: "single" },
  seller: { table: "Sellers", displayField: "Seller", mode: "single" },
  restrictionsCompany: { table: "Companies", displayField: "ID", mode: "multi" },
};
