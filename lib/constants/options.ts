import type {
  ProductAssortment,
  InventoryCondition,
  PricingStrengthSurplus,
  PricingStrengthWholesale,
  BrandDemandSurplus,
  BrandDemandWholesale,
  LocationSurplus,
  LocationWholesale,
  RestrictionsSurplus,
  RestrictionsWholesale,
  CategoryGroup,
  InventoryExclusivity,
  Paperwork,
  PackagingType,
  InventoryAvailability,
  PriceColumns,
  ListingDisaggregation,
} from "../types";
import type { RadioOption } from "./shared";

// ─── Section 1: Primary Details ───────────────────────────────────────────────

export const INVENTORY_TYPE_OPTIONS: RadioOption[] = [
  { value: "Discount", label: "Discount" },
  { value: "Wholesale", label: "Wholesale" },
];

// ─── Section 2: Grading Details ───────────────────────────────────────────────

export const PRODUCT_ASSORTMENT_OPTIONS: RadioOption<ProductAssortment>[] = [
  { value: "5: Hero SKUs and bestselling items", label: "5: Hero SKUs", color: "#22c55e" },
  { value: "4: Mostly core categories", label: "4: Mostly core", color: "#eab308" },
  { value: "3: Mixed core and non-core items", label: "3: Core + non-core mix", color: "#f97316" },
  { value: "2: Mostly non-core with some appeal", label: "2: Mostly non-core", color: "#ef4444" },
  { value: "1: Non-core styles and categories", label: "1: Non-core styles", color: "#dc2626" },
];

export const INVENTORY_CONDITION_OPTIONS: RadioOption<InventoryCondition>[] = [
  { value: "5: Brand new with hang tags", label: "5: New with tags", color: "#22c55e" },
  { value: "4: New without tags (NWOT)", label: "4: New without tags", color: "#eab308" },
  { value: "3: Clean returns/store stock", label: "3: Clean returns", color: "#f97316" },
  { value: "2: Damaged/pre-loved condition", label: "2: Damaged/pre-loved", color: "#ef4444" },
  { value: "1: Major damages", label: "1: Major damage", color: "#dc2626" },
];

export const PRICING_STRENGTH_SURPLUS_OPTIONS: RadioOption<PricingStrengthSurplus>[] = [
  { value: "5: Greater than 90% off", label: "5: >90% off MSRP", color: "#22c55e" },
  { value: "4: 85% off", label: "4: ~85% off MSRP", color: "#eab308" },
  { value: "3: 80% off", label: "3: ~80% off MSRP", color: "#f97316" },
  { value: "2: 70-80% off", label: "2: 70-80% off MSRP", color: "#ef4444" },
  { value: "1: Less than 70% off", label: "1: <70% off MSRP", color: "#dc2626" },
];

export const PRICING_STRENGTH_WHOLESALE_OPTIONS: RadioOption<PricingStrengthWholesale>[] = [
  { value: "5: 10%+ below market pricing, when compared to historical listings", label: "5: 10%+ below market", color: "#22c55e" },
  { value: "4: <10% below market pricing, when compared to historical listings", label: "4: <10% below market", color: "#eab308" },
  { value: "3: Around wholesale pricing, but we have no historical listing data", label: "3: Around wholesale", color: "#f97316" },
  { value: "2: Above market pricing, but seller is willing to negotiate", label: "2: Above market (flexible)", color: "#ef4444" },
  { value: "1: Above market pricing (e.g. wholesale+, <20% vs. lowest price online)", label: "1: Above market", color: "#dc2626" },
];

export const BRAND_DEMAND_SURPLUS_OPTIONS: RadioOption<BrandDemandSurplus>[] = [
  { value: "5: Internationally recognized brand with full-price wholesale presence in top retailers", label: "5: Top-tier global brand", color: "#22c55e" },
  { value: "4: Viral/trending brand high demand from live sellers- minimal off price distribution", label: "4: Viral/trending brand", color: "#eab308" },
  { value: "3: Highly distributed in off-price", label: "3: Broad off-price distro", color: "#f97316" },
  { value: "2: Limited brand recognition", label: "2: Limited recognition", color: "#ef4444" },
  { value: "1: Unknown or no-name brand", label: "1: Unknown/no-name", color: "#dc2626" },
];

export const BRAND_DEMAND_WHOLESALE_OPTIONS: RadioOption<BrandDemandWholesale>[] = [
  { value: "5: Internationally recognized brand with full-price wholesale presence in top retailers", label: "5: Top-tier global brand", color: "#22c55e" },
  { value: "4: Viral/trending brand high demand from live sellers- minimal off price distribution", label: "4: Viral/trending brand", color: "#eab308" },
  { value: "3: Highly distributed in off-price", label: "3: Broad off-price distro", color: "#f97316" },
  { value: "2: Limited brand recognition", label: "2: Limited recognition", color: "#ef4444" },
  { value: "1: Unknown or no-name brand", label: "1: Unknown/no-name", color: "#dc2626" },
];

export const LOCATION_SURPLUS_OPTIONS: RadioOption<LocationSurplus>[] = [
  { value: "5: Located in US", label: "5: US-based", color: "#22c55e" },
  { value: "4: International but seller will land goods in US", label: "4: Intl, will land in US", color: "#eab308" },
  { value: "3: Located in US but can only sell internationally", label: "3: US-based, intl-only sales", color: "#f97316" },
  { value: "2: Bonded warehouse OR international but can sell anywhere", label: "2: Bonded/intl, broad sales", color: "#ef4444" },
  { value: "1: International, cannot sell in current location", label: "1: Intl, location limits sales", color: "#dc2626" },
];

export const LOCATION_WHOLESALE_OPTIONS: RadioOption<LocationWholesale>[] = [
  { value: "5: US location OR buyer pickup available", label: "5: US location / pickup", color: "#22c55e" },
  { value: "4: International, seller will handle US landing", label: "4: Intl, seller handles landing", color: "#eab308" },
  { value: "3: International, seller has estimated landed costs", label: "3: Intl, landed costs estimated", color: "#f97316" },
  { value: "2: International, seller cannot import (beauty/fragrance - easy import)", label: "2: Intl, no import (beauty/fragrance)", color: "#ef4444" },
  { value: "1: International, seller cannot import (non-beauty/fragrance)", label: "1: Intl, no import (non-beauty)", color: "#dc2626" },
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

export const LEAD_TIME_INTERVAL_OPTIONS: string[] = ["Hour(s)", "Day(s)", "Week(s)", "Month(s)"];

// ─── Section 6: Qualification ─────────────────────────────────────────────────

export const ITEMIZATION_TYPE_OPTIONS: RadioOption[] = [
  { value: "Standard", label: "Standard" },
  { value: "Lightning Lot", label: "Lightning Lot", color: "#a855f7" },
];

// ─── Section 7: Pricing ───────────────────────────────────────────────────────

export const CURRENCY_TYPE_OPTIONS = [
  "USD $", "EUR €", "GBP £", "JPY ¥", "KRW ₩", "CAD", "AUD", "UAE", "CNY", "PLN", "CHF",
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

// ─── Multi-Select Options (from Airtable metadata) ───────────────────────────

export const TAG_PRESET_OPTIONS = [
  "Assorted Beauty",
  "Multibrand Luxury Assortment",
  "Retailer Beauty",
  "Wholesale Domestic",
  "Wholesale International",
];

export const BUYER_TYPE_OPTIONS = [
  "Amazon / Walmart seller",
  "Bin store",
  "Brand",
  "Brick and mortar",
  "Distributor",
  "Ghost agent",
  "Jobber",
  "Liquidator",
  "Liveseller",
  "Online",
  "Other",
  "Reseller",
  "Retailer",
  "Subscription box",
  "Wholesale",
];

export const COUNTRY_OPTIONS = [
  "United States", "Afghanistan", "Albania", "Algeria", "Andorra", "Angola",
  "Antigua and Barbuda", "Argentina", "Armenia", "Aruba", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus",
  "Belgium", "Belize", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil",
  "Brunei", "Bulgaria", "Cambodia", "Cameroon", "Canada", "Cayman Islands",
  "Chile", "China", "Colombia", "Congo", "Costa Rica", "Croatia", "Cuba",
  "Cyprus", "Czech Republic", "Denmark", "Dominican Republic", "Ecuador", "Egypt",
  "El Salvador", "Estonia", "Faroe Islands", "Finland", "France", "French Polynesia",
  "Gabon", "Georgia", "Germany", "Ghana", "Greece", "Greenland", "Guadeloupe",
  "Guam", "Guatemala", "Guinea", "Haiti", "Honduras", "Hong Kong", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Isle of Man",
  "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya",
  "Kosovo", "Kuwait", "Latvia", "Lebanon", "Libya", "Liechtenstein", "Luxembourg",
  "Macedonia", "Madagascar", "Malaysia", "Malta", "Martinique", "Mauritius",
  "Mayotte", "Mexico", "Mongolia", "Montenegro", "Morocco", "Mozambique",
  "Myanmar (Burma)", "Namibia", "Nepal", "Netherlands", "New Caledonia",
  "New Zealand", "Nicaragua", "Nigeria", "Norway", "Oman", "Pakistan",
  "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines",
  "Poland", "Portugal", "Puerto Rico", "Republic of Korea", "Republic of Lithuania",
  "Republic of Moldova", "Romania", "Russia", "San Marino", "Saudi Arabia",
  "Senegal", "Serbia", "Singapore", "Slovakia", "Slovenia", "South Africa",
  "Spain", "Sri Lanka", "St. Lucia", "Sudan", "Suriname", "Swaziland", "Sweden",
  "Switzerland", "Taiwan", "Tanzania", "Thailand", "Trinidad and Tobago", "Tunisia",
  "Turkey", "U.S. Virgin Islands", "Ukraine", "United Arab Emirates",
  "United Kingdom", "Uruguay", "Venezuela", "Vietnam", "Zambia", "Zimbabwe",
];

export const US_STATE_OPTIONS = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
  "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
  "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY", "N/A",
];
