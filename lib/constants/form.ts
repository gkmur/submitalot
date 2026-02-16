import type { ItemizationFormData, FormFieldName, SectionId } from "../types";

// ─── Helper Text ──────────────────────────────────────────────────────────────

export const HELPER_TEXT: Partial<Record<keyof ItemizationFormData, string>> = {
  seller: "If your seller doesn't exist, enter and select NEW SELLER - GHOST TEMP.",
  newSellerId: "Since your Seller is not on platform, create a profile on admin, then enter their Seller ID below.",
  inventoryFile: "Submit your inventory file. If you have multiple sheets, please combine them into one file.",
  additionalFiles: "Submit additional photos or files relating to the inventory. Images of product, packaging, paperwork, etc.",
  inventoryType: "This should reflect the actual goods, not your business segment.",
  productAssortment: "How strong is the assortment of inventory?\n(Example: Adidas Sambas = core, Adidas wallets = non-core)",
  inventoryCondition: "What is the overall condition of the inventory?\nWholesale inventory: Most items should be rated as Brand New with Hang Tags.",
  overallListingRating: "Rate the overall quality of this inventory based off your knowledge (used to refine current criteria)",
  pricingStrengthSurplus: "What discount off MSRP is the seller offering? (Surplus)",
  pricingStrengthWholesale: "How competitive is the pricing after Ghost's markup? (Wholesale)",
  brandDemandSurplus: "Consider brand awareness, distribution channels, and market presence. (Surplus)",
  brandDemandWholesale: "Consider brand awareness, distribution channels, and market presence. (Wholesale)",
  locationSurplus: "What is the inventory location status? (Surplus)",
  locationWholesale: "What is the inventory location status? (Wholesale)",
  restrictionsSurplus: "How flexible is the seller about where inventory can be sold? (Surplus)",
  restrictionsWholesale: "How flexible is the seller about where inventory can be sold? (Wholesale)",
  categoryGroups: "Select all product categories in this inventory",
  inventoryExclusivity: "Is the inventory exclusive to Ghost?",
  paperwork: "Select the type of paperwork the seller has available for this inventory.",
  tagPresets: "Choose a preset that applies multiple relevant tags to your listing at once.",
  allTags: "Add any tags that match your lot.",
  minimumOrder: "Enter the minimum order (quantity or dollar value or take-all). Ex. 1400 units or $3k or take-all",
  packagingType: "How is the inventory currently packaged and ready for sale?",
  packagingDetails: "Additional details on the packaging",
  currencyType: "Select the type of currency in your file.",
  marginTakeRate: "The percentage of the Buyer's price that Ghost keeps as commission. If you only have a markup %, use the workbook to convert it to a take rate.",
  priceColumns: "What price columns are in your inventory file?",
  sellerPriceColumn: "Indicate the header name, NOT the column letter.",
  buyerPriceColumn: "Indicate the header name, NOT the column letter.",
  referencePriceColumn: "Enter the name of the column to calculate the Seller Price. Indicate the header name, NOT the column letter.",
  maxPercentOffAsking: "Automatically decline offers below this percentage of the Seller asking price",
  listingDisaggregation: "Choose how to break down your lot into individual listings for buyers.",
  stealth: "Prevents the listing from being automatically shared/available to buyers. Listing must be shared manually.",
  restrictionsString: "Enter any restrictions that apply.",
  notes: "Enter any additional notes about the inventory below.",
};

// ─── Default Values ───────────────────────────────────────────────────────────

export const FORM_DEFAULTS: Partial<ItemizationFormData> = {
  leadTimeNumber: 4,
  currencyType: "USD $",
  maxPercentOffAsking: 16,
  listingDisaggregation: "One listing",
  region: "United States",
  stealth: false,
  p0FireListing: false,
  categoryGroups: [],
  tagPresets: [],
  inventoryFile: [],
  additionalFiles: [],
  restrictionsCompany: [],
  restrictionsBuyerType: [],
  restrictionsRegion: [],
};

// ─── Section → Field Mapping ─────────────────────────────────────────────────

export const SECTION_FIELD_MAP = {
  primary: ["brandPartner", "seller", "newSellerId", "inventoryFile", "additionalFiles", "inventoryType"],
  grading: ["productAssortment", "inventoryCondition", "overallListingRating", "pricingStrengthSurplus", "pricingStrengthWholesale", "brandDemandSurplus", "brandDemandWholesale", "locationSurplus", "locationWholesale", "restrictionsSurplus", "restrictionsWholesale"],
  inventory: ["categoryGroups", "inventoryExclusivity", "paperwork", "tagPresets", "allTags", "inventoryNotes"],
  location: ["region", "state", "city"],
  logistics: ["minimumOrder", "packagingType", "packagingDetails", "inventoryAvailability", "fobOrExw", "leadTimeNumber", "leadTimeInterval"],
  pricing: ["currencyType", "inlandFreight", "marginTakeRate", "priceColumns", "sellerPriceColumn", "buyerPriceColumn", "flatOrReference", "referencePriceColumn", "increaseOrDecrease", "maxPercentOffAsking"],
  restrictions: ["listingDisaggregation", "customDisaggregation", "stealth", "restrictionsString", "restrictionsCompany", "restrictionsBuyerType", "restrictionsRegion", "p0FireListing", "notes"],
} as const satisfies Record<SectionId, readonly FormFieldName[]>;
