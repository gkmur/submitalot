import type { ItemizationFormData, FormFieldName } from "./types";

type FormState = Partial<ItemizationFormData>;

// Fields that are always visible — no conditions
const ALWAYS_VISIBLE = new Set<FormFieldName>([
  "brandPartner", "seller", "inventoryFile", "additionalFiles", "inventoryType",
  "productAssortment", "inventoryCondition", "overallListingRating",
  "categoryGroups", "inventoryExclusivity", "paperwork", "tagPresets", "allTags", "inventoryNotes",
  "region", "state", "city",
  "minimumOrder", "packagingType", "packagingDetails", "inventoryAvailability",
  "fobOrExw", "leadTimeNumber", "leadTimeInterval",
  // "itemizationType", // commented out — qualification section disabled
  "currencyType", "inlandFreight", "marginTakeRate", "priceColumns", "maxPercentOffAsking",
  "listingDisaggregation", "stealth", "restrictionsString",
  "restrictionsCompany", "restrictionsBuyerType", "restrictionsRegion",
  "p0FireListing", "notes",
]);

// Branch 1: Inventory Type → Surplus/Wholesale grading variants
const SURPLUS_FIELDS = new Set<FormFieldName>([
  "pricingStrengthSurplus", "brandDemandSurplus", "locationSurplus", "restrictionsSurplus",
]);

const WHOLESALE_FIELDS = new Set<FormFieldName>([
  "pricingStrengthWholesale", "brandDemandWholesale", "locationWholesale", "restrictionsWholesale",
]);

export function shouldShowField(fieldName: FormFieldName, state: FormState): boolean {
  if (ALWAYS_VISIBLE.has(fieldName)) return true;

  // Branch 1: Inventory Type
  if (SURPLUS_FIELDS.has(fieldName)) return state.inventoryType === "Discount";
  if (WHOLESALE_FIELDS.has(fieldName)) return state.inventoryType === "Wholesale";

  // Branch 2: Seller → New Seller ID
  if (fieldName === "newSellerId") return state.seller === "NEW SELLER - GHOST TEMP";

  // Branch 3: Price Columns → sub-fields
  if (fieldName === "sellerPriceColumn") {
    return state.priceColumns === "Seller Price" || state.priceColumns === "Both";
  }
  if (fieldName === "buyerPriceColumn") {
    return state.priceColumns === "Buyer Price" || state.priceColumns === "Both";
  }
  if (fieldName === "flatOrReference") {
    return state.priceColumns === "None";
  }
  if (fieldName === "referencePriceColumn") {
    return state.priceColumns === "None" && state.flatOrReference === "Reference";
  }
  if (fieldName === "increaseOrDecrease") {
    return state.priceColumns === "None" && state.flatOrReference === "Reference";
  }

  // Branch 4: Listing disaggregation → Custom
  if (fieldName === "customDisaggregation") {
    return state.listingDisaggregation === "Custom";
  }

  return true;
}

// Returns field names that should be cleared when their parent condition changes
export function getFieldsToClear(
  changedField: FormFieldName,
  newValue: string
): FormFieldName[] {
  if (changedField === "inventoryType") {
    if (newValue === "Discount") {
      return [...WHOLESALE_FIELDS];
    }
    if (newValue === "Wholesale") {
      return [...SURPLUS_FIELDS];
    }
  }

  if (changedField === "seller" && newValue !== "NEW SELLER - GHOST TEMP") {
    return ["newSellerId"];
  }

  if (changedField === "priceColumns") {
    const toClear: FormFieldName[] = [];
    if (newValue !== "Seller Price" && newValue !== "Both") toClear.push("sellerPriceColumn");
    if (newValue !== "Buyer Price" && newValue !== "Both") toClear.push("buyerPriceColumn");
    if (newValue !== "None") toClear.push("flatOrReference", "referencePriceColumn", "increaseOrDecrease");
    return toClear;
  }

  if (changedField === "flatOrReference" && newValue !== "Reference") {
    return ["referencePriceColumn", "increaseOrDecrease"];
  }

  if (changedField === "listingDisaggregation" && newValue !== "Custom") {
    return ["customDisaggregation"];
  }

  return [];
}

// Ordered list of parent fields whose conditionals should be evaluated during scrub
const CONDITIONAL_SCRUB_ORDER: FormFieldName[] = [
  "inventoryType", "seller", "priceColumns", "flatOrReference", "listingDisaggregation",
];

// Scrubs orphaned conditional field values from a data snapshot before restore
export function scrubOrphanedFields(data: Partial<ItemizationFormData>): Partial<ItemizationFormData> {
  const scrubbed = { ...data };
  for (const parent of CONDITIONAL_SCRUB_ORDER) {
    const value = scrubbed[parent];
    if (typeof value === "string") {
      const toClear = getFieldsToClear(parent, value);
      for (const field of toClear) {
        delete scrubbed[field];
      }
    } else if (value === undefined) {
      // Parent missing — clear all possible children
      const toClear = getFieldsToClear(parent, "");
      for (const field of toClear) {
        delete scrubbed[field];
      }
    }
  }
  return scrubbed;
}
