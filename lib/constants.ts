import type {
  ProductAssortment, InventoryCondition, PricingStrengthSurplus,
  PricingStrengthWholesale, BrandDemandSurplus, BrandDemandWholesale,
  LocationSurplus, LocationWholesale, RestrictionsSurplus, RestrictionsWholesale,
  CategoryGroup, InventoryExclusivity, Paperwork, PackagingType,
  InventoryAvailability, LeadTimeInterval, PriceColumns, ListingDisaggregation,
  ItemizationFormData,
} from "./types";

// ─── Radio Option Type ────────────────────────────────────────────────────────

export interface RadioOption<T extends string = string> {
  value: T;
  label: string;
  color?: string;
}

// ─── Section 1: Primary Details ───────────────────────────────────────────────

export const INVENTORY_TYPE_OPTIONS: RadioOption[] = [
  { value: "Discount", label: "Discount" },
  { value: "Wholesale", label: "Wholesale" },
];

// ─── Section 2: Grading Details ───────────────────────────────────────────────

export const PRODUCT_ASSORTMENT_OPTIONS: RadioOption<ProductAssortment>[] = [
  { value: "5: Hero SKUs and bestselling items", label: "5: Hero SKUs and bestselling items", color: "#22c55e" },
  { value: "4: Mostly core categories", label: "4: Mostly core categories", color: "#eab308" },
  { value: "3: Mixed core and non-core items", label: "3: Mixed core and non-core items", color: "#f97316" },
  { value: "2: Mostly non-core with some appeal", label: "2: Mostly non-core with some appeal", color: "#ef4444" },
  { value: "1: Non-core styles and categories", label: "1: Non-core styles and categories", color: "#dc2626" },
];

export const INVENTORY_CONDITION_OPTIONS: RadioOption<InventoryCondition>[] = [
  { value: "5: Brand new with hang tags", label: "5: Brand new with hang tags", color: "#22c55e" },
  { value: "4: New without tags (NWOT)", label: "4: New without tags (NWOT)", color: "#eab308" },
  { value: "3: Clean returns/store stock", label: "3: Clean returns/store stock", color: "#f97316" },
  { value: "2: Damaged/pre-loved condition", label: "2: Damaged/pre-loved condition", color: "#ef4444" },
  { value: "1: Major damages", label: "1: Major damages", color: "#dc2626" },
];

export const PRICING_STRENGTH_SURPLUS_OPTIONS: RadioOption<PricingStrengthSurplus>[] = [
  { value: "5: Greater than 90% off", label: "5: Greater than 90% off", color: "#22c55e" },
  { value: "4: 85% off", label: "4: 85% off", color: "#eab308" },
  { value: "3: 80% off", label: "3: 80% off", color: "#f97316" },
  { value: "2: 70-80% off", label: "2: 70-80% off", color: "#ef4444" },
  { value: "1: Less than 70% off", label: "1: Less than 70% off", color: "#dc2626" },
];

export const PRICING_STRENGTH_WHOLESALE_OPTIONS: RadioOption<PricingStrengthWholesale>[] = [
  { value: "5: 10%+ below market pricing, when compared to historical listings", label: "5: 10%+ below market pricing, when compared to historical listings", color: "#22c55e" },
  { value: "4: <10% below market pricing, when compared to historical listings", label: "4: <10% below market pricing, when compared to historical listings", color: "#eab308" },
  { value: "3: Around wholesale pricing, but we have no historical listing data", label: "3: Around wholesale pricing, but we have no historical listing data", color: "#f97316" },
  { value: "2: Above market pricing, but seller is willing to negotiate", label: "2: Above market pricing, but seller is willing to negotiate", color: "#ef4444" },
  { value: "1: Above market pricing (e.g. wholesale+, <20% vs. lowest price online)", label: "1: Above market pricing (e.g. wholesale+, <20% vs. lowest price online)", color: "#dc2626" },
];

export const BRAND_DEMAND_SURPLUS_OPTIONS: RadioOption<BrandDemandSurplus>[] = [
  { value: "5: Internationally recognized brand with full-price wholesale presence in top retailers", label: "5: Internationally recognized brand with full-price wholesale presence in top retailers", color: "#22c55e" },
  { value: "4: Viral/trending brand high demand from live sellers- minimal off price distribution", label: "4: Viral/trending brand high demand from live sellers- minimal off price distribution", color: "#eab308" },
  { value: "3: Highly distributed in off-price", label: "3: Highly distributed in off-price", color: "#f97316" },
  { value: "2: Limited brand recognition", label: "2: Limited brand recognition", color: "#ef4444" },
  { value: "1: Unknown or no-name brand", label: "1: Unknown or no-name brand", color: "#dc2626" },
];

export const BRAND_DEMAND_WHOLESALE_OPTIONS: RadioOption<BrandDemandWholesale>[] = [
  { value: "5: Internationally recognized brand with full-price wholesale presence in top retailers", label: "5: Internationally recognized brand with full-price wholesale presence in top retailers", color: "#22c55e" },
  { value: "4: Viral/trending brand high demand from live sellers- minimal off price distribution", label: "4: Viral/trending brand high demand from live sellers- minimal off price distribution", color: "#eab308" },
  { value: "3: Highly distributed in off-price", label: "3: Highly distributed in off-price", color: "#f97316" },
  { value: "2: Limited brand recognition", label: "2: Limited brand recognition", color: "#ef4444" },
  { value: "1: Unknown or no-name brand", label: "1: Unknown or no-name brand", color: "#dc2626" },
];

export const LOCATION_SURPLUS_OPTIONS: RadioOption<LocationSurplus>[] = [
  { value: "5: Located in US", label: "5: Located in US", color: "#22c55e" },
  { value: "4: International but seller will land goods in US", label: "4: International but seller will land goods in US", color: "#eab308" },
  { value: "3: Located in US but can only sell internationally", label: "3: Located in US but can only sell internationally", color: "#f97316" },
  { value: "2: Bonded warehouse OR international but can sell anywhere", label: "2: Bonded warehouse OR international but can sell anywhere", color: "#ef4444" },
  { value: "1: International, cannot sell in current location", label: "1: International, cannot sell in current location", color: "#dc2626" },
];

export const LOCATION_WHOLESALE_OPTIONS: RadioOption<LocationWholesale>[] = [
  { value: "5: US location OR buyer pickup available", label: "5: US location OR buyer pickup available", color: "#22c55e" },
  { value: "4: International, seller will handle US landing", label: "4: International, seller will handle US landing", color: "#eab308" },
  { value: "3: International, seller has estimated landed costs", label: "3: International, seller has estimated landed costs", color: "#f97316" },
  { value: "2: International, seller cannot import (beauty/fragrance - easy import)", label: "2: International, seller cannot import (beauty/fragrance - easy import)", color: "#ef4444" },
  { value: "1: International, seller cannot import (non-beauty/fragrance)", label: "1: International, seller cannot import (non-beauty/fragrance)", color: "#dc2626" },
];

export const RESTRICTIONS_SURPLUS_OPTIONS: RadioOption<RestrictionsSurplus>[] = [
  { value: "5: No restrictions", label: "5: No restrictions", color: "#22c55e" },
  { value: "4: Few restrictions", label: "4: Few restrictions", color: "#eab308" },
  { value: "3: Moderate restrictions", label: "3: Moderate restrictions", color: "#f97316" },
  { value: "2: Some restrictions", label: "2: Some restrictions", color: "#ef4444" },
  { value: "1: Very restrictive", label: "1: Very restrictive", color: "#dc2626" },
];

export const RESTRICTIONS_WHOLESALE_OPTIONS: RadioOption<RestrictionsWholesale>[] = [
  { value: "5: No restrictions", label: "5: No restrictions", color: "#22c55e" },
  { value: "4: Few restrictions", label: "4: Few restrictions", color: "#eab308" },
  { value: "3: Moderate restrictions", label: "3: Moderate restrictions", color: "#f97316" },
  { value: "2: Some restrictions", label: "2: Some restrictions", color: "#ef4444" },
  { value: "1: Very restrictive", label: "1: Very restrictive", color: "#dc2626" },
];

// ─── Section 3: Inventory Details ─────────────────────────────────────────────

export const CATEGORY_GROUP_OPTIONS: CategoryGroup[] = [
  "Apparel", "Accessories", "Footwear", "Bath & Beauty", "Home",
];

export const INVENTORY_EXCLUSIVITY_OPTIONS: RadioOption<InventoryExclusivity>[] = [
  { value: "Exclusive", label: "Exclusive", color: "#22c55e" },
  { value: "Exclusive, but for a Limited Time", label: "Exclusive, but for a Limited Time", color: "#eab308" },
  { value: "Don't know", label: "Don't know", color: "#3b82f6" },
  { value: "Not Exclusive", label: "Not Exclusive" },
];

export const PAPERWORK_OPTIONS: RadioOption<Paperwork>[] = [
  { value: "Release", label: "Release", color: "#22c55e" },
  { value: "Paperwork on Request", label: "Paperwork on Request", color: "#eab308" },
  { value: "Sanitized Invoice", label: "Sanitized Invoice" },
  { value: "Not Available", label: "Not Available" },
];

// ─── Section 5: Logistics ─────────────────────────────────────────────────────

export const PACKAGING_TYPE_OPTIONS: RadioOption<PackagingType>[] = [
  { value: "Retail Ready", label: "Retail Ready", color: "#22c55e" },
  { value: "E-commerce Ready", label: "E-commerce Ready", color: "#3b82f6" },
  { value: "Assortment", label: "Assortment", color: "#a855f7" },
];

export const INVENTORY_AVAILABILITY_OPTIONS: RadioOption<InventoryAvailability>[] = [
  { value: "ATS", label: "ATS", color: "#22c55e" },
  { value: "Prebook", label: "Prebook", color: "#3b82f6" },
  { value: "Third party", label: "Third party", color: "#a855f7" },
  { value: "Packed", label: "Packed", color: "#14b8a6" },
  { value: "Catalog", label: "Catalog" },
  { value: "Owned", label: "Owned", color: "#eab308" },
];

export const FOB_EXW_OPTIONS: RadioOption[] = [
  { value: "FOB", label: "FOB" },
  { value: "EXW", label: "EXW" },
];

export const LEAD_TIME_INTERVAL_OPTIONS: LeadTimeInterval[] = ["Days", "Weeks", "Months"];

// ─── Section 6: Qualification ─────────────────────────────────────────────────

export const ITEMIZATION_TYPE_OPTIONS: RadioOption[] = [
  { value: "Standard", label: "Standard" },
  { value: "Lightning Lot", label: "Lightning Lot", color: "#a855f7" },
];

// ─── Section 7: Pricing ───────────────────────────────────────────────────────

export const CURRENCY_TYPE_OPTIONS = [
  "USD $", "EUR €", "GBP £", "CAD $", "AUD $",
];

export const INLAND_FREIGHT_OPTIONS: RadioOption[] = [
  { value: "Yes", label: "Yes", color: "#22c55e" },
  { value: "No", label: "No", color: "#ef4444" },
];

export const PRICE_COLUMNS_OPTIONS: RadioOption<PriceColumns>[] = [
  { value: "Seller Price", label: "Seller Price", color: "#22c55e" },
  { value: "Buyer Price", label: "Buyer Price", color: "#3b82f6" },
  { value: "Both", label: "Both", color: "#a855f7" },
  { value: "None", label: "None" },
];

export const FLAT_OR_REFERENCE_OPTIONS = ["Flat Item Price", "Reference"];

export const INCREASE_DECREASE_OPTIONS: RadioOption[] = [
  { value: "Increase", label: "Increase" },
  { value: "Decrease", label: "Decrease" },
];

// ─── Section 8: Restrictions & Listing ────────────────────────────────────────

export const LISTING_DISAGGREGATION_OPTIONS: RadioOption<ListingDisaggregation>[] = [
  { value: "One listing", label: "One listing", color: "#3b82f6" },
  { value: "By gender", label: "By gender", color: "#22c55e" },
  { value: "By brand", label: "By brand", color: "#22c55e" },
  { value: "By category group (Apparel, Footwear, etc.)", label: "By category group (Apparel, Footwear, etc.)", color: "#eab308" },
  { value: "By category (Tops, Outerwear, etc.)", label: "By category (Tops, Outerwear, etc.)", color: "#f97316" },
  { value: "By spreadsheet tab (one listing per tab)", label: "By spreadsheet tab (one listing per tab)", color: "#a855f7" },
  { value: "Custom", label: "Custom", color: "#3b82f6" },
];

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

// ─── Airtable Field Mapping ───────────────────────────────────────────────────

export const AIRTABLE_FIELD_MAP: Partial<Record<keyof ItemizationFormData, string>> = {
  brandPartner: "Brand Partner",
  seller: "Seller",
  newSellerId: "Seller ID (new seller)",
  inventoryFile: "Inventory File",
  additionalFiles: "Additional Files",
  inventoryType: "Inventory Type",
  productAssortment: "Product Assortment",
  inventoryCondition: "Inventory Condition",
  overallListingRating: "Overall Listing Rating",
  pricingStrengthSurplus: "SP Pricing",
  pricingStrengthWholesale: "WH Pricing",
  brandDemandSurplus: "SP Brand Demand",
  brandDemandWholesale: "WH Brand Demand",
  locationSurplus: "SP Location",
  locationWholesale: "WH Location",
  restrictionsSurplus: "SP Restrictions",
  restrictionsWholesale: "WH Restrictions",
  categoryGroups: "Category Groups",
  inventoryExclusivity: "Inventory Exclusivity",
  paperwork: "Paperwork",
  tagPresets: "Tag presets",
  allTags: "All tags",
  inventoryNotes: "Notes",
  region: "Region",
  state: "State",
  city: "City",
  minimumOrder: "Minimum Order",
  packagingType: "Packaging Type",
  packagingDetails: "Packaging Details",
  inventoryAvailability: "Inventory Availability",
  fobOrExw: "FOB or EXW?",
  leadTimeNumber: "Lead Time Number",
  leadTimeInterval: "Lead Time Interval",
  itemizationType: "Itemization Type",
  currencyType: "Currency Type",
  inlandFreight: "Does this lot incur inland freight?",
  marginTakeRate: "Margin % (Take Rate)",
  priceColumns: "Price Columns",
  sellerPriceColumn: "Seller Price Column",
  buyerPriceColumn: "Buyer Price Column",
  flatOrReference: "Flat Item Price or Reference?",
  referencePriceColumn: "Reference Price Column",
  increaseOrDecrease: "Increase or decrease?",
  maxPercentOffAsking: "Max Percent Off Asking",
  listingDisaggregation: "Listing disaggregation",
  customDisaggregation: "Custom disaggregation",
  stealth: "Stealth?",
  restrictionsString: "Restrictions (string)",
  restrictionsCompany: "Restrictions (Company)",
  restrictionsBuyerType: "Restrictions (Buyer Type)",
  restrictionsRegion: "Restrictions (Region)",
  p0FireListing: "P0 Fire Listing?",
  notes: "Notes",
};
