import type { FormFieldName } from "./types";

export interface LinkedRecordConfig {
  table: string;
  displayField: string;
  mode: "single" | "multi";
  previewFields?: string[];
  sortField?: string;
  sortDirection?: "asc" | "desc";
}

export const LINKED_RECORD_FIELDS: Partial<Record<FormFieldName, LinkedRecordConfig>> = {
  brandPartner: { table: "Admins", displayField: "Name", mode: "single", previewFields: ["Email"], sortField: "Name", sortDirection: "asc" },
  seller: { table: "Sellers", displayField: "Seller", mode: "single", previewFields: ["Company"], sortField: "Created", sortDirection: "desc" },
  restrictionsCompany: { table: "Companies", displayField: "ID", mode: "multi", previewFields: ["Name"], sortField: "Name", sortDirection: "asc" },
};
