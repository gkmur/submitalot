import type { FormFieldName } from "./types";

export interface LinkedRecordConfig {
  table: string;
  displayField: string;
  mode: "single" | "multi";
}

export const LINKED_RECORD_FIELDS: Partial<Record<FormFieldName, LinkedRecordConfig>> = {
  brandPartner: { table: "Brand Partners", displayField: "Name", mode: "single" },
  seller: { table: "Sellers", displayField: "Name", mode: "single" },
  tagPresets: { table: "Tags", displayField: "Name", mode: "multi" },
  restrictionsCompany: { table: "Companies", displayField: "Name", mode: "multi" },
  restrictionsBuyerType: { table: "Buyer Types", displayField: "Name", mode: "multi" },
  restrictionsRegion: { table: "Regions", displayField: "Name", mode: "multi" },
};
