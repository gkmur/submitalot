# Itemization Form — Custom Replacement

**Date:** 2026-02-11
**Status:** Brainstorm

## What We're Building

A custom Next.js + TypeScript web form that replaces the existing Airtable "Itemization Form" for Ghost's internal inventory submission workflow. The form submits directly to the Airtable API (Inventory table), keeping existing downstream workflows intact.

**Goals:**
- Replicate all fields, sections, conditional logic, defaults, and helper text exactly
- Clean modern redesign (not pixel-clone) — same structure, fresh look
- Direct Airtable API integration (no intermediary backend)
- Foundation for future optimizations (better UX, smarter defaults, AI-assisted fields)

## Why This Approach

- **Next.js + TypeScript:** Conditional form logic is complex (Inventory Type branching, Price Columns branching, Seller selection). React + TypeScript gives us type-safe form state management and clean conditional rendering.
- **Direct Airtable API:** Simplest migration path. The form currently writes to Airtable, downstream n8n workflows trigger from Airtable. No changes needed to the automation pipeline.
- **Modern redesign:** Users keep the same mental model (sections, field order, workflow) but get a better experience. Room to add features Airtable forms can't do.

## Key Decisions

1. **Tech stack:** Next.js + TypeScript, direct Airtable API submission
2. **Visual approach:** Clean modern design, same section structure and field order
3. **Data flow:** Custom form → Airtable API → existing n8n workflows continue working
4. **Auth:** Airtable form currently requires Airtable sign-in (gabriel@ghst.io). New form will need auth consideration (addressed in planning).

## Complete Form Specification

### Form Metadata
- **Title:** Itemization Form
- **Description:** Ghost's internal inventory submission form
- **Source table:** Inventory (Airtable base: appJAw6Q1CgRc8mCK)
- **Total fields:** ~59 visible (38 always-visible + ~21 conditional)
- **Submit button label:** Submit
- **Post-submit message:** "Thanks for your submission" (truncated in config)
- **Linked form:** Sold Out Listing form (separate form, linked in description)

---

### Section 1: Primary Details

| # | Field | Type | Required | Default | Helper Text | Conditional |
|---|-------|------|----------|---------|-------------|-------------|
| 1 | Brand Partner | User picker | Yes | — | — | — |
| 2 | Seller | Account/linked record | Yes | — | "If your seller doesn't exist, enter and select NEW SELLER - GHOST TEMP." | — |
| 3 | New Seller ID | Text input | Yes | — | "Since your Seller is not on platform, create a profile on admin, then enter their Seller ID below." (link to admin) | **Show when: Seller = "NEW SELLER - GHOST TEMP"** |
| 4 | Inventory File | File upload | Yes | — | "Submit your inventory file. If you have multiple sheets, please combine them into one file." | — |
| 5 | Additional Files | File upload | No | — | "Submit additional photos or files relating to the inventory. *Images of product, packaging, paperwork, etc.*" | — |
| 6 | Inventory Type | Radio (single) | Yes | — | "This should reflect the actual goods, *not* your business segment." | — |

**Inventory Type options:**
- Discount
- Wholesale

---

### Section 2: Grading Details

| # | Field | Type | Required | Helper Text | Conditional |
|---|-------|------|----------|-------------|-------------|
| 7 | Product Assortment | Radio 1-5 | Yes | "How strong is the assortment of inventory? (Example: Adidas Sambas = core, Adidas wallets = non-core)" | — |
| 8 | Inventory Condition | Radio 1-5 | Yes | "What is the overall condition of the inventory? **Wholesale inventory:** Most items should be rated as *Brand New with Hang Tags*." | — |
| 9 | Overall Listing Rating | Star rating 1-5 | Yes | "Rate the overall quality of this inventory based off your knowledge (used to refine current criteria)" | — |
| 10 | Pricing Strength (Surplus) | Radio 1-5 | Yes | "What discount off MSRP is the seller offering? (Surplus)" | **Show when: Inventory Type = Discount** |
| 11 | Pricing Strength (Wholesale) | Radio 1-5 | Yes | "How competitive is the pricing after Ghost's markup? (Wholesale)" | **Show when: Inventory Type = Wholesale** |
| 12 | Brand Demand (Surplus) | Radio 1-5 | Yes | "Consider brand awareness, distribution channels, and market presence. (Surplus)" | **Show when: Inventory Type = Discount** |
| 13 | Brand Demand (Wholesale) | Radio 1-5 | Yes | (Wholesale variant) | **Show when: Inventory Type = Wholesale** |
| 14 | Location (Surplus) | Radio 1-5 | Yes | "What is the inventory location status? (Surplus)" | **Show when: Inventory Type = Discount** |
| 15 | Location (Wholesale) | Radio 1-5 | Yes | "What is the inventory location status? (Wholesale)" | **Show when: Inventory Type = Wholesale** |
| 16 | Restrictions (Surplus) | Radio 1-5 | Yes | "How flexible is the seller about where inventory can be sold? (Surplus)" | **Show when: Inventory Type = Discount** |
| 17 | Restrictions (Wholesale) | Radio 1-5 | Yes | (Wholesale variant) | **Show when: Inventory Type = Wholesale** |

**Product Assortment options (1-5):**
- 5: Hero SKUs and bestselling items
- 4: Mostly core categories
- 3: Mixed core and non-core items
- 2: Mostly non-core with some appeal
- 1: Non-core styles and categories

**Inventory Condition options (1-5):**
- 5: Brand new with hang tags
- 4: New without tags (NWOT)
- 3: Clean returns/store stock
- 2: Damaged/pre-loved condition
- 1: Major damages

**Pricing Strength — Surplus (source: SP Pricing):**
- 5: Greater than 90% off
- 4: 85% off
- 3: 80% off
- 2: 70-80% off
- 1: Less than 70% off

**Pricing Strength — Wholesale (source: WH Pricing):**
- 5: 10%+ below market pricing, when compared to historical listings
- 4: <10% below market pricing, when compared to historical listings
- 3: Around wholesale pricing, but we have no historical listing data
- 2: Above market pricing, but seller is willing to negotiate
- 1: Above market pricing (e.g. wholesale+, <20% vs. lowest price online)

**Brand Demand — Surplus:**
- 5: Internationally recognized brand with full-price wholesale presence in top retailers
- 4: Viral/trending brand high demand from live sellers — minimal off price distribution
- 3: Highly distributed in off-price
- (2 and 1: need to verify from form)

**Location — Surplus:**
- 5: Located in US
- 4: International but seller will land goods in US
- 3: Located in US but can only sell internationally
- 2: Bonded warehouse OR international but can sell anywhere
- 1: International, cannot sell in current location

**Location — Wholesale:**
- 5: US location OR buyer pickup available
- 4: International, seller will handle US landing
- 3: International, seller has estimated landed costs
- 2: International, seller cannot import (beauty/fragrance - easy import)
- 1: International, seller cannot import (non-beauty/fragrance)

**Restrictions — Surplus:**
- 5: No restrictions
- 4: Few restrictions
- 3: Moderate restrictions
- 2: Some restrictions
- 1: Very restrictive

---

### Section 3: Inventory Details

| # | Field | Type | Required | Helper Text | Conditional |
|---|-------|------|----------|-------------|-------------|
| 18 | Category Groups | Multi-select checkboxes | Yes | "Select all product categories in this inventory" | — |
| 19 | Inventory Exclusivity | Radio (single) | Yes | "Is the inventory exclusive to Ghost?" | — |
| 20 | Paperwork | Radio (single) | Yes | "Select the type of paperwork the seller has available for this inventory." | — |
| 21 | Tag presets | Combobox/multi-select | No | "Choose a preset that applies multiple relevant tags to your listing at once." (link: Tag presets → admin.ghst.io/tags) | — |
| 22 | All tags | Text input | No | "Add any tags that match your lot." (link: View all tags here) | — |
| 23 | Notes | Text area | No | — | — |

**Category Groups options:**
- Apparel
- Accessories
- Footwear
- Bath & Beauty
- Home

**Inventory Exclusivity options:**
- Exclusive
- Exclusive, but for a Limited Time
- Don't know
- Not Exclusive

**Paperwork options:**
- Release
- Paperwork on Request
- Sanitized Invoice
- Not Available

---

### Section 4: Location

| # | Field | Type | Required | Default | Helper Text |
|---|-------|------|----------|---------|-------------|
| 24 | Region | Dropdown | No | United States | — |
| 25 | State | Dropdown | No | — | — |
| 26 | City | Text input | No | — | — |

---

### Section 5: Logistics

| # | Field | Type | Required | Default | Helper Text |
|---|-------|------|----------|---------|-------------|
| 27 | Minimum Order | Text input | Yes | — | "Enter the minimum order (quantity or dollar value or take-all). Ex. 1400 units or $3k or take-all" |
| 28 | Packaging Type | Radio (single) | Yes | — | "How is the inventory currently packaged and ready for sale?" |
| 29 | Packaging Details | Text input | No | — | "Additional details on the packaging" |
| 30 | Inventory Availability | Radio (single) | Yes | — | — |
| 31 | FOB or EXW? | Radio (single) | Yes | — | — |
| 32 | Lead Time Number | Integer input | Yes | **4** | Format: Integer |
| 33 | Lead Time Interval | Dropdown | Yes | — | — |

**Packaging Type options:**
- Retail Ready
- E-commerce Ready
- Assortment

**Inventory Availability options:**
- ATS
- Prebook
- Third party
- Packed
- Catalog
- Owned

**FOB or EXW options:**
- FOB
- EXW

---

### Section 6: Qualification

| # | Field | Type | Required | Helper Text |
|---|-------|------|----------|-------------|
| 34 | Itemization Type | Radio (single) | Yes | — |

**Itemization Type options:**
- Standard
- Lightning Lot

---

### Section 7: Pricing

**Section note:** Link at top — "FAQs on how to fill out this section" (links to Notion doc)

| # | Field | Type | Required | Default | Helper Text | Conditional |
|---|-------|------|----------|---------|-------------|-------------|
| 35 | Currency Type | Dropdown | Yes | **USD $** | "Select the type of currency in your file." | — |
| 36 | Does this lot incur inland freight? | Radio (single) | Yes | — | — | — |
| 37 | Margin % (Take Rate) | Percent input | Yes | — | "The percentage of the Buyer's price that Ghost keeps as commission. *If you only have a markup %, use [this workbook](sheets link) to convert it to a take rate.*" | — |
| 38 | Price Columns | Radio (single) | Yes | — | "What price columns are in your inventory file?" | — |
| 39 | Seller Price Column | Text input | Yes | — | "Indicate the header name, NOT the column letter." | **Show when: Price Columns = "Seller Price" or "Both"** |
| 40 | Buyer Price Column | Text input | Yes | — | "Indicate the header name, NOT the column letter." | **Show when: Price Columns = "Buyer Price" or "Both"** |
| 41 | Flat Item Price or Reference? | Dropdown | Yes | — | — | **Show when: Price Columns = "None"** (needs verification) |
| 42 | Reference Price Column | Text input | Yes | — | "Enter the name of the column to calculate the Seller Price. Indicate the header name, NOT the column letter." | **Show when: Flat Item Price = "Reference"** (needs verification) |
| 43 | Increase or decrease? | Radio/dropdown | Yes | — | — | **Show when: related to Reference Price** (needs verification) |
| 44 | Max Percent Off Asking | Percent input | Yes | **16%** | "Automatically decline offers below this percentage of the Seller asking price" | — |

**Does this lot incur inland freight? options:**
- Yes
- No

**Price Columns options:**
- Seller Price
- Buyer Price
- Both
- None

---

### Section 8: Restrictions & Listing

| # | Field | Type | Required | Default | Helper Text | Conditional |
|---|-------|------|----------|---------|-------------|-------------|
| 45 | Listing disaggregation | Radio (single) | Yes | **One listing** | "Choose how to break down your lot into individual listings for buyers." (has Clear selection) | — |
| 46 | Custom disaggregation | Text input | Yes | — | — | **Show when: Listing disaggregation = "Custom"** |
| 47 | Stealth? | Checkbox | No | unchecked | "Prevents the listing from being automatically shared/available to buyers. Listing must be shared manually." | — |
| 48 | Restrictions (string) | Text area | No | — | "Enter any restrictions that apply." | — |
| 49 | Restrictions (Company) | Linked record (company picker) | No | — | — | — |
| 50 | Restrictions (Buyer Type) | Multi-select | No | — | — | — |
| 51 | Restrictions (Region) | Multi-select | No | — | — | — |
| 52 | P0 Fire Listing? | Checkbox | No | unchecked | — | — |
| 53 | Notes | Text area | No | — | "Enter any additional notes about the inventory below." | — |

**Listing disaggregation options:**
- One listing (default)
- By gender
- By brand
- By category group (Apparel, Footwear, etc.)
- By category (Tops, Outerwear, etc.)
- By spreadsheet tab (one listing per tab)
- Custom

---

## Conditional Logic Summary

### Branch 1: Inventory Type (Discount vs Wholesale)
The primary branching logic. When Inventory Type is selected, different grading rubrics appear:

| Inventory Type = Discount (Surplus) | Inventory Type = Wholesale |
|-------------------------------------|---------------------------|
| Pricing Strength (SP Pricing) — MSRP discount % | Pricing Strength (WH Pricing) — market competitiveness |
| Brand Demand (Surplus) — brand recognition | Brand Demand (Wholesale) — wholesale variant |
| Location (Surplus) — US/international status | Location (Wholesale) — shipping/import capability |
| Restrictions (Surplus) — seller flexibility | Restrictions (Wholesale) — wholesale variant |

### Branch 2: Seller Selection
- **New Seller ID** → visible only when Seller = "NEW SELLER - GHOST TEMP"

### Branch 3: Price Columns
- **Seller Price Column** → visible when Price Columns = "Seller Price" or "Both"
- **Buyer Price Column** → visible when Price Columns = "Buyer Price" or "Both"
- **Flat Item Price or Reference?** → visible based on Price Columns (needs verification)
- **Reference Price Column** → visible when Flat Item Price = "Reference" (needs verification)
- **Increase or decrease?** → chained from Reference Price (needs verification)

### Branch 4: Listing Disaggregation
- **Custom disaggregation** → visible when Listing disaggregation = "Custom"

## Default Values
- Lead Time Number: **4**
- Currency Type: **USD $**
- Max Percent Off Asking: **16%**
- Listing disaggregation: **One listing**
- Region: **United States**

## External Links in Form
- Sold Out Listing form: `airtable.com/appJAw6Q1CgRc8mCK/pagUS4vy2rkib4vuU/form`
- Tag presets: `admin.ghst.io/tags`
- All tags reference: `airtable.com/appJAw6Q1CgRc8mCK/pagp0VTtdc9fH8feQ`
- Pricing FAQs: Notion doc (ghostinc)
- Markup to take rate workbook: Google Sheets
- New seller profile creation: admin link

## Open Questions
- [ ] Exact conditional rules for Pricing fields (41-43) — need to verify Price Columns sub-branching
- [ ] Brand Demand (Wholesale) and Restrictions (Wholesale) full option lists — need to verify from form
- [ ] Auth approach — Airtable form uses Airtable sign-in. What auth for the custom form?
- [ ] Airtable API token management — where to store/manage the PAT?
- [ ] Lead Time Interval dropdown options — need to pull from Airtable field config
- [ ] Currency Type dropdown options — need full list from Airtable
- [ ] Tag presets and All tags — these reference linked records. How to populate in custom form?
- [ ] Restrictions (Company/Buyer Type/Region) — these are linked records. Need Airtable API for search/autocomplete.
