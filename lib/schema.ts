import { z } from "zod";

const uploadedFile = z.object({
  name: z.string(),
  url: z.string().url(),
  size: z.number(),
  type: z.string(),
});

const linkedRecord = z.object({
  id: z.string(),
  name: z.string(),
});

export const itemizationSchema = z.object({
  // Section 1: Primary Details
  brandPartner: z.string().min(1, "Brand Partner is required"),
  seller: z.string().min(1, "Seller is required"),
  newSellerId: z.string().optional().default(""),
  inventoryFile: z.array(uploadedFile).min(1, "Inventory file is required"),
  additionalFiles: z.array(uploadedFile).optional().default([]),
  inventoryType: z.enum(["Discount", "Wholesale"], { required_error: "Inventory type is required" }),

  // Section 2: Grading Details
  productAssortment: z.string().min(1, "Product assortment is required"),
  inventoryCondition: z.string().min(1, "Inventory condition is required"),
  overallListingRating: z.number().min(1).max(5),
  pricingStrengthSurplus: z.string().optional().default(""),
  pricingStrengthWholesale: z.string().optional().default(""),
  brandDemandSurplus: z.string().optional().default(""),
  brandDemandWholesale: z.string().optional().default(""),
  locationSurplus: z.string().optional().default(""),
  locationWholesale: z.string().optional().default(""),
  restrictionsSurplus: z.string().optional().default(""),
  restrictionsWholesale: z.string().optional().default(""),

  // Section 3: Inventory Details
  categoryGroups: z.array(z.string()).min(1, "Select at least one category"),
  inventoryExclusivity: z.string().min(1, "Inventory exclusivity is required"),
  paperwork: z.string().min(1, "Paperwork type is required"),
  tagPresets: z.array(z.string()).optional().default([]),
  allTags: z.string().optional().default(""),
  inventoryNotes: z.string().optional().default(""),

  // Section 4: Location
  region: z.string().min(1, "Region is required"),
  state: z.string().optional().default(""),
  city: z.string().optional().default(""),

  // Section 5: Logistics
  minimumOrder: z.string().min(1, "Minimum order is required"),
  packagingType: z.string().min(1, "Packaging type is required"),
  packagingDetails: z.string().optional().default(""),
  inventoryAvailability: z.string().min(1, "Inventory availability is required"),
  fobOrExw: z.enum(["FOB", "EXW"], { required_error: "Select FOB or EXW" }),
  leadTimeNumber: z.number().min(0),
  leadTimeInterval: z.enum(["Hour(s)", "Day(s)", "Week(s)", "Month(s)"]),

  // Section 6: Qualification (commented out — can be re-enabled later)
  // itemizationType: z.enum(["Standard", "Lightning Lot"]),

  // Section 7: Pricing
  currencyType: z.string().min(1, "Currency type is required"),
  inlandFreight: z.enum(["Yes", "No"]),
  marginTakeRate: z.number().min(0).max(100),
  priceColumns: z.enum(["Seller Price", "Buyer Price", "Both", "None"]),
  sellerPriceColumn: z.string().optional().default(""),
  buyerPriceColumn: z.string().optional().default(""),
  flatOrReference: z.enum(["Flat Item Price", "Reference"]).optional(),
  referencePriceColumn: z.string().optional().default(""),
  increaseOrDecrease: z.enum(["Increase", "Decrease"]).optional(),
  maxPercentOffAsking: z.number().min(0).max(100),

  // Section 8: Restrictions & Listing
  listingDisaggregation: z.string().min(1),
  customDisaggregation: z.string().optional().default(""),
  stealth: z.boolean(),
  restrictionsString: z.string().optional().default(""),
  restrictionsCompany: z.array(z.string()).optional().default([]),
  restrictionsBuyerType: z.array(z.string()).optional().default([]),
  restrictionsRegion: z.array(z.string()).optional().default([]),
  p0FireListing: z.boolean(),
  notes: z.string().optional().default(""),
}).superRefine((data, ctx) => {
  if (data.priceColumns === "None" && !data.flatOrReference) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["flatOrReference"],
      message: "Flat Item Price or Reference is required when Price Columns is None",
    });
  }

  if (data.flatOrReference === "Reference" && !data.referencePriceColumn) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["referencePriceColumn"],
      message: "Reference Price Column is required when Flat Item Price or Reference is Reference",
    });
  }

  if (data.flatOrReference === "Reference" && !data.increaseOrDecrease) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["increaseOrDecrease"],
      message: "Increase or Decrease is required when Flat Item Price or Reference is Reference",
    });
  }
});

export type ItemizationSchemaType = z.infer<typeof itemizationSchema>;
