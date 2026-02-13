export type InventoryType = "Discount" | "Wholesale";

export type ProductAssortment =
  | "5: Hero SKUs and bestselling items"
  | "4: Mostly core categories"
  | "3: Mixed core and non-core items"
  | "2: Mostly non-core with some appeal"
  | "1: Non-core styles and categories";

export type InventoryCondition =
  | "5: Brand new with hang tags"
  | "4: New without tags (NWOT)"
  | "3: Clean returns/store stock"
  | "2: Damaged/pre-loved condition"
  | "1: Major damages";

export type PricingStrengthSurplus =
  | "5: Greater than 90% off"
  | "4: 85% off"
  | "3: 80% off"
  | "2: 70-80% off"
  | "1: Less than 70% off";

export type PricingStrengthWholesale =
  | "5: 10%+ below market pricing, when compared to historical listings"
  | "4: <10% below market pricing, when compared to historical listings"
  | "3: Around wholesale pricing, but we have no historical listing data"
  | "2: Above market pricing, but seller is willing to negotiate"
  | "1: Above market pricing (e.g. wholesale+, <20% vs. lowest price online)";

export type BrandDemandSurplus =
  | "5: Internationally recognized brand with full-price wholesale presence in top retailers"
  | "4: Viral/trending brand high demand from live sellers- minimal off price distribution"
  | "3: Highly distributed in off-price"
  | "2: Limited brand recognition"
  | "1: Unknown or no-name brand";

export type BrandDemandWholesale =
  | "5: Internationally recognized brand with full-price wholesale presence in top retailers"
  | "4: Viral/trending brand high demand from live sellers- minimal off price distribution"
  | "3: Highly distributed in off-price"
  | "2: Limited brand recognition"
  | "1: Unknown or no-name brand";

export type LocationSurplus =
  | "5: Located in US"
  | "4: International but seller will land goods in US"
  | "3: Located in US but can only sell internationally"
  | "2: Bonded warehouse OR international but can sell anywhere"
  | "1: International, cannot sell in current location";

export type LocationWholesale =
  | "5: US location OR buyer pickup available"
  | "4: International, seller will handle US landing"
  | "3: International, seller has estimated landed costs"
  | "2: International, seller cannot import (beauty/fragrance - easy import)"
  | "1: International, seller cannot import (non-beauty/fragrance)";

export type RestrictionsSurplus =
  | "5: No restrictions"
  | "4: Few restrictions"
  | "3: Moderate restrictions"
  | "2: Some restrictions"
  | "1: Very restrictive";

export type RestrictionsWholesale =
  | "5: No restrictions"
  | "4: Few restrictions"
  | "3: Moderate restrictions"
  | "2: Some restrictions"
  | "1: Very restrictive";

export type CategoryGroup = "Apparel" | "Accessories" | "Footwear" | "Bath & Beauty" | "Home";

export type InventoryExclusivity =
  | "Exclusive"
  | "Exclusive, but for a Limited Time"
  | "Don't know"
  | "Not Exclusive";

export type Paperwork = "Release" | "Paperwork on Request" | "Sanitized Invoice" | "Not Available";

export type PackagingType = "Retail Ready" | "E-commerce Ready" | "Assortment";

export type InventoryAvailability = "ATS" | "Prebook" | "Third party" | "Packed" | "Catalog" | "Owned";

export type ShippingTerms = "FOB" | "EXW";

export type LeadTimeInterval = "Hour(s)" | "Day(s)" | "Week(s)" | "Month(s)";

export type ItemizationType = "Standard" | "Lightning Lot";

export type InlandFreight = "Yes" | "No";

export type PriceColumns = "Seller Price" | "Buyer Price" | "Both" | "None";

export type FlatOrReference = "Flat Item Price" | "Reference";

export type IncreaseOrDecrease = "Increase" | "Decrease";

export type ListingDisaggregation =
  | "One listing"
  | "By gender"
  | "By brand"
  | "By category group (Apparel, Footwear, etc.)"
  | "By category (Tops, Outerwear, etc.)"
  | "By spreadsheet tab (one listing per tab)"
  | "Custom";

export interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface LinkedRecord {
  id: string;
  name: string;
  metadata?: Record<string, string>;
}

export interface ItemizationFormData {
  // Section 1: Primary Details
  brandPartner: string;
  seller: string;
  newSellerId: string;
  inventoryFile: UploadedFile[];
  additionalFiles: UploadedFile[];
  inventoryType: InventoryType;

  // Section 2: Grading Details
  productAssortment: ProductAssortment;
  inventoryCondition: InventoryCondition;
  overallListingRating: number;
  pricingStrengthSurplus: PricingStrengthSurplus;
  pricingStrengthWholesale: PricingStrengthWholesale;
  brandDemandSurplus: BrandDemandSurplus;
  brandDemandWholesale: BrandDemandWholesale;
  locationSurplus: LocationSurplus;
  locationWholesale: LocationWholesale;
  restrictionsSurplus: RestrictionsSurplus;
  restrictionsWholesale: RestrictionsWholesale;

  // Section 3: Inventory Details
  categoryGroups: CategoryGroup[];
  inventoryExclusivity: InventoryExclusivity;
  paperwork: Paperwork;
  tagPresets: string[];
  allTags: string;
  inventoryNotes: string;

  // Section 4: Location
  region: string;
  state: string;
  city: string;

  // Section 5: Logistics
  minimumOrder: string;
  packagingType: PackagingType;
  packagingDetails: string;
  inventoryAvailability: InventoryAvailability;
  fobOrExw: ShippingTerms;
  leadTimeNumber: number;
  leadTimeInterval: LeadTimeInterval;

  // Section 6: Qualification
  itemizationType: ItemizationType;

  // Section 7: Pricing
  currencyType: string;
  inlandFreight: InlandFreight;
  marginTakeRate: number;
  priceColumns: PriceColumns;
  sellerPriceColumn: string;
  buyerPriceColumn: string;
  flatOrReference: FlatOrReference;
  referencePriceColumn: string;
  increaseOrDecrease: IncreaseOrDecrease;
  maxPercentOffAsking: number;

  // Section 8: Restrictions & Listing
  listingDisaggregation: ListingDisaggregation;
  customDisaggregation: string;
  stealth: boolean;
  restrictionsString: string;
  restrictionsCompany: string[];
  restrictionsBuyerType: string[];
  restrictionsRegion: string[];
  p0FireListing: boolean;
  notes: string;
}

export type FormFieldName = keyof ItemizationFormData;

export type SectionId =
  | "primary"
  | "grading"
  | "inventory"
  | "location"
  | "logistics"
  | "pricing"
  | "restrictions";
