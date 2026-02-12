---
title: "feat: Custom Itemization Form Replacement"
type: feat
date: 2026-02-11
brainstorm: docs/brainstorms/2026-02-11-itemization-form-brainstorm.md
---

# Custom Itemization Form Replacement

## Overview

Build a Next.js + TypeScript web form that replaces Ghost's Airtable "Itemization Form" for internal inventory submission. The form replicates all 59 fields across 8 sections with 4 conditional logic branches, submits directly to the Airtable API, and uses a clean modern design while preserving the existing workflow structure.

## Problem Statement

The current Airtable form works but is constrained by Airtable's form builder limitations:
- No custom validation or smart defaults beyond basic field config
- Limited conditional logic UX (fields appear/disappear without transition)
- No draft saving or form state persistence
- No control over loading states, error handling, or submission UX
- Can't integrate custom business logic (e.g., auto-calculating fields, smart suggestions)
- Locked into Airtable's visual design and interaction patterns

A custom form opens the door to all of these while maintaining the existing data flow: form → Airtable → n8n workflows → Ghost.

## Proposed Solution

A Next.js App Router application with:
- **Server Actions** for secure Airtable API calls (PAT never exposed client-side)
- **React Hook Form + Zod** for type-safe form state and validation
- **Sectioned single-page layout** matching the existing 8-section structure
- **Modern CSS** (Grid, custom properties) — no heavy UI library
- **File staging** via Airtable's direct attachment URL support or a simple upload proxy

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────┐
│           Next.js App Router            │
│                                         │
│  ┌──────────┐    ┌──────────────────┐   │
│  │  Form UI │───▶│  Server Actions   │  │
│  │ (Client) │    │  (Server-side)    │  │
│  └──────────┘    └────────┬─────────┘   │
│                           │             │
└───────────────────────────┼─────────────┘
                            │
                   ┌────────▼────────┐
                   │  Airtable API   │
                   │  (REST + PAT)   │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │  n8n Workflows  │
                   │  (Airtable      │
                   │   triggers)     │
                   └─────────────────┘
```

**Key architectural decisions:**
- Server Actions (not API routes) — simpler, colocated with the form, automatic server-side execution
- Airtable PAT lives in `.env.local`, accessed only server-side
- Form state managed client-side with React Hook Form; submission goes through Server Action
- Linked record options fetched via Server Actions and cached client-side

### Project Structure

```
submitalot/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Form page (single-page app)
│   ├── globals.css                   # Global styles + CSS custom properties
│   └── actions/
│       ├── submit-inventory.ts       # Server Action: create Airtable record
│       ├── fetch-options.ts          # Server Action: fetch linked record options
│       └── upload-file.ts            # Server Action: handle file upload → URL
├── components/
│   ├── form/
│   │   ├── ItemizationForm.tsx       # Main form orchestrator
│   │   ├── FormSection.tsx           # Section wrapper (heading, divider)
│   │   ├── sections/
│   │   │   ├── PrimaryDetails.tsx
│   │   │   ├── GradingDetails.tsx
│   │   │   ├── InventoryDetails.tsx
│   │   │   ├── LocationSection.tsx
│   │   │   ├── LogisticsSection.tsx
│   │   │   ├── QualificationSection.tsx
│   │   │   ├── PricingSection.tsx
│   │   │   └── RestrictionsListing.tsx
│   │   └── fields/
│   │       ├── RadioScale.tsx        # Reusable 1-5 rating radio (colored pills)
│   │       ├── RadioGroup.tsx        # Generic radio group
│   │       ├── StarRating.tsx        # 5-star rating widget
│   │       ├── FileUpload.tsx        # Drag-and-drop file upload
│   │       ├── LinkedRecordPicker.tsx # Search/autocomplete for linked records
│   │       ├── MultiSelect.tsx       # Multi-select with pills
│   │       ├── SelectDropdown.tsx    # Styled dropdown
│   │       ├── TextInput.tsx         # Text input with helper text
│   │       ├── TextArea.tsx          # Multi-line text input
│   │       └── Checkbox.tsx          # Checkbox with label
│   └── ui/
│       ├── SubmitButton.tsx          # Submit with loading state
│       └── SuccessScreen.tsx         # Post-submit confirmation
├── lib/
│   ├── airtable.ts                   # Airtable API client (server-only)
│   ├── schema.ts                     # Zod schema for form validation
│   ├── types.ts                      # TypeScript types for form data
│   ├── constants.ts                  # Field options, section config, defaults
│   └── conditional-logic.ts          # Visibility rules as pure functions
├── docs/                             # Existing
├── .claude/                          # Existing
├── .env.local                        # AIRTABLE_PAT, AIRTABLE_BASE_ID
├── .env.example                      # Template for env vars
├── .gitignore                        # Updated for Next.js
├── next.config.ts
├── tsconfig.json
├── package.json
└── README.md                         # Setup instructions (only if requested)
```

### Implementation Phases

#### Phase 1: Foundation

**Goal:** Working Next.js app with Airtable connection, type system, and empty form shell.

**Tasks:**
- [ ] Initialize Next.js project with TypeScript (`npx create-next-app@latest . --typescript --app --no-tailwind --no-eslint`) in `app/`
- [ ] Update `.gitignore` for Next.js (`.next/`, `node_modules/`, `.env.local`)
- [ ] Create `.env.local` and `.env.example` with `AIRTABLE_PAT` and `AIRTABLE_BASE_ID=appJAw6Q1CgRc8mCK`
- [ ] Build `lib/airtable.ts` — thin Airtable REST client (create record, list records, upload attachment)
- [ ] Build `lib/types.ts` — full TypeScript types for all 59 form fields
- [ ] Build `lib/schema.ts` — Zod validation schema with all required/optional rules and format constraints
- [ ] Build `lib/constants.ts` — all radio options, dropdown options, default values, helper text strings
- [ ] Build `lib/conditional-logic.ts` — pure functions: `shouldShowField(fieldName, formState) → boolean`
- [ ] Install deps: `react-hook-form`, `@hookform/resolvers`, `zod`
- [ ] Create basic `app/page.tsx` with form shell and section headings
- [ ] Verify Airtable API connection with a test Server Action

**Files created:**
- `lib/airtable.ts`
- `lib/types.ts`
- `lib/schema.ts`
- `lib/constants.ts`
- `lib/conditional-logic.ts`
- `app/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- `.env.local`, `.env.example`
- `next.config.ts`, `tsconfig.json`, `package.json`

#### Phase 2: Core Form Sections (Always-Visible Fields)

**Goal:** All 8 sections rendered with their always-visible fields. No conditional fields yet.

**Tasks:**
- [ ] Build reusable field components in `components/form/fields/`:
  - `RadioGroup.tsx` — generic radio with colored pill options
  - `RadioScale.tsx` — 1-5 scale variant with color gradient (green → red)
  - `StarRating.tsx` — clickable 5-star widget
  - `TextInput.tsx` — with label, required indicator, helper text, format hint
  - `TextArea.tsx` — multi-line variant
  - `SelectDropdown.tsx` — styled native select
  - `MultiSelect.tsx` — checkbox list (for Category Groups)
  - `Checkbox.tsx` — single checkbox with label and description
  - `FileUpload.tsx` — drag-and-drop zone (upload logic in Phase 4)
- [ ] Build `FormSection.tsx` — section wrapper with heading and visual divider
- [ ] Build section components (always-visible fields only):
  - `PrimaryDetails.tsx` — Brand Partner (placeholder), Seller (placeholder), Inventory File, Additional Files, Inventory Type
  - `GradingDetails.tsx` — Product Assortment, Inventory Condition, Overall Listing Rating
  - `InventoryDetails.tsx` — Category Groups, Inventory Exclusivity, Paperwork, Tag presets (placeholder), All tags, Notes
  - `LocationSection.tsx` — Region, State, City
  - `LogisticsSection.tsx` — Minimum Order, Packaging Type, Packaging Details, Inventory Availability, FOB or EXW, Lead Time Number, Lead Time Interval
  - `QualificationSection.tsx` — Itemization Type
  - `PricingSection.tsx` — Currency Type, Inland freight, Margin %, Price Columns, Max Percent Off Asking
  - `RestrictionsListing.tsx` — Listing disaggregation, Stealth, Restrictions (string), P0 Fire Listing, Notes
- [ ] Wire up `ItemizationForm.tsx` with React Hook Form, all sections, default values
- [ ] Apply global styles in `globals.css` — dark theme, section layout, form typography

**Files created:**
- `components/form/fields/*.tsx` (10 files)
- `components/form/FormSection.tsx`
- `components/form/sections/*.tsx` (8 files)
- `components/form/ItemizationForm.tsx`

#### Phase 3: Conditional Logic

**Goal:** All 4 conditional branches working with smooth show/hide transitions.

**Tasks:**
- [ ] Wire `lib/conditional-logic.ts` into each section component
- [ ] **Branch 1 — Inventory Type:** In `GradingDetails.tsx`, conditionally render:
  - Pricing Strength (Surplus) when type = Discount, (Wholesale) when type = Wholesale
  - Brand Demand (Surplus/Wholesale) — same pattern
  - Location (Surplus/Wholesale) — same pattern
  - Restrictions grading (Surplus/Wholesale) — same pattern
- [ ] **Branch 2 — Seller:** In `PrimaryDetails.tsx`, show "New Seller ID" when Seller = "NEW SELLER - GHOST TEMP"
- [ ] **Branch 3 — Price Columns:** In `PricingSection.tsx`:
  - Show Seller Price Column when "Seller Price" or "Both"
  - Show Buyer Price Column when "Buyer Price" or "Both"
  - Show Flat Item Price or Reference when "None"
  - Show Reference Price Column when Flat Item Price = "Reference"
  - Show Increase or decrease when Reference is selected
- [ ] **Branch 4 — Listing:** In `RestrictionsListing.tsx`, show Custom disaggregation when "Custom"
- [ ] Handle branch switching: clear conditional field values when parent selection changes
- [ ] Add CSS transitions for field appear/disappear (opacity + height animation)

**Files modified:**
- `components/form/sections/GradingDetails.tsx`
- `components/form/sections/PrimaryDetails.tsx`
- `components/form/sections/PricingSection.tsx`
- `components/form/sections/RestrictionsListing.tsx`

#### Phase 4: Linked Records, File Uploads, and Server Actions

**Goal:** All interactive fields work end-to-end. Form can be submitted to Airtable.

**Tasks:**
- [ ] Build `app/actions/fetch-options.ts` — Server Action to fetch linked record lists from Airtable:
  - Sellers table → populate Seller picker
  - Brand Partners → populate Brand Partner picker
  - Tags/Tag presets → populate tag fields
  - Companies → populate Restrictions (Company)
  - Buyer Types → populate Restrictions (Buyer Type)
  - Regions → populate Restrictions (Region)
- [ ] Build `LinkedRecordPicker.tsx` — search/autocomplete component with debounced Airtable search
- [ ] Update `PrimaryDetails.tsx` — wire Brand Partner and Seller with LinkedRecordPicker
- [ ] Update `InventoryDetails.tsx` — wire Tag presets and All tags
- [ ] Update `RestrictionsListing.tsx` — wire Company, Buyer Type, Region pickers
- [ ] Build `app/actions/upload-file.ts` — Server Action for file upload (stage file, return URL for Airtable)
- [ ] Wire `FileUpload.tsx` to upload action with progress indicator
- [ ] Build `app/actions/submit-inventory.ts` — Server Action that:
  - Validates form data with Zod schema
  - Maps form field names to Airtable field names
  - Transforms values to Airtable-expected formats (%, linked record IDs, attachment URLs)
  - Calls Airtable create record API
  - Returns success/error result
- [ ] Build `SubmitButton.tsx` with loading state, disable on submit, error display
- [ ] Build `SuccessScreen.tsx` — post-submit confirmation with "Submit Another" option

**Files created/modified:**
- `app/actions/submit-inventory.ts`
- `app/actions/fetch-options.ts`
- `app/actions/upload-file.ts`
- `components/form/fields/LinkedRecordPicker.tsx`
- `components/ui/SubmitButton.tsx`
- `components/ui/SuccessScreen.tsx`

#### Phase 5: Validation, Error Handling, and Polish

**Goal:** Production-ready form with robust validation, error states, and polish.

**Tasks:**
- [ ] Wire Zod schema validation to React Hook Form (real-time field validation on blur)
- [ ] Add field-level error messages with clear styling
- [ ] Add section-level error summary (scroll to first error on submit)
- [ ] Handle Airtable API errors gracefully:
  - Network timeout → retry button, preserve form data
  - 422 validation error → map Airtable error to form field
  - 429 rate limit → queue and retry with backoff
  - 500 server error → generic error with retry
- [ ] Prevent double-submission (disable button, check for duplicate within time window)
- [ ] Add `localStorage`-based draft persistence:
  - Auto-save form state every 30 seconds
  - Restore on page load with "Resume draft?" prompt
  - Clear draft on successful submission
- [ ] Add form-level progress indicator (section completion dots or progress bar)
- [ ] Keyboard navigation: proper tab order, enter to advance, escape to clear
- [ ] Loading skeleton for initial linked record fetches
- [ ] File upload: drag visual feedback, upload progress bar, file type/size validation
- [ ] Responsive layout: ensure form works on tablet-width (1024px+); mobile is nice-to-have

**Files modified:**
- All section components (error display)
- `ItemizationForm.tsx` (draft persistence, progress)
- `components/form/fields/*.tsx` (error states)
- `app/globals.css` (error styles, responsive breakpoints)

## Acceptance Criteria

### Functional Requirements
- [ ] All 59 fields render correctly with proper types, labels, and helper text
- [ ] All 4 conditional branches work correctly (show/hide fields based on selections)
- [ ] All default values pre-populated (Lead Time: 4, Currency: USD $, Max %: 16%, Listing: One listing, Region: US)
- [ ] Form submits to Airtable Inventory table and creates a valid record
- [ ] Linked record fields (Seller, Brand Partner, Tags, Restrictions) populated from Airtable
- [ ] File uploads work for Inventory File and Additional Files
- [ ] Required field validation prevents submission of incomplete forms
- [ ] Post-submit confirmation screen with "Submit Another" option

### Non-Functional Requirements
- [ ] Airtable PAT never exposed to client-side code
- [ ] Form loads in < 3 seconds (including linked record fetch)
- [ ] No data loss on network failure (draft persistence)
- [ ] Accessible: keyboard navigable, proper ARIA labels on custom widgets

### Quality Gates
- [ ] TypeScript strict mode — no `any` types in form schema or Airtable mapping
- [ ] All conditional logic testable as pure functions in `conditional-logic.ts`
- [ ] Form field → Airtable field mapping documented in `lib/constants.ts`

## Dependencies & Prerequisites

| Dependency | Status | Notes |
|-----------|--------|-------|
| Airtable PAT | **Needed** | Personal Access Token with write access to Inventory table |
| Airtable base ID | Known | `appJAw6Q1CgRc8mCK` |
| Node.js 20+ | Assumed | For Next.js |
| Missing field options | **Needed** | Lead Time Interval, Currency Type, Brand Demand 1-2, Restrictions (Wholesale), Buyer Type options, Region options |
| Price Columns conditional rules (fields 41-43) | **Needs verification** | Test in Airtable form to confirm exact branching |
| Auth decision | **Deferred** | Start without auth; add later. Form is internal-only. |
| File upload destination | **Decision needed** | Options: Airtable direct upload URL, or proxy through Server Action to temp storage |

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Airtable API rate limits (5 req/sec) | Medium | High | Batch linked record fetches on initial load; cache results; debounce search |
| Missing/incorrect field options | High | Medium | Fetch options dynamically from Airtable metadata API rather than hardcoding |
| File upload complexity | Medium | High | Start with simple file input + Server Action proxy; enhance drag-and-drop later |
| Form too long on one page | Low | Medium | Section navigation sidebar or sticky progress indicator |
| n8n workflow conflict | Low | High | Add a "Source" field to Airtable records to distinguish form vs email submissions |

## Open Questions (To Resolve During Implementation)

1. **Auth:** Start without auth (internal tool, URL not public). Add Google OAuth (`@ghst.io` domain) when needed.
2. **File uploads:** Airtable accepts attachment URLs. Simplest path: Server Action receives file, uploads to a temp URL (or uses Airtable's upload endpoint directly), returns URL for record creation.
3. **Verify Price Columns branching:** Test in the live Airtable form — select "None" for Price Columns and document which fields appear.
4. **Fetch missing options:** Use Airtable metadata API (`GET /meta/bases/{baseId}/tables`) to pull all field configs dynamically.

## References

### Internal
- Brainstorm: `docs/brainstorms/2026-02-11-itemization-form-brainstorm.md`
- n8n workflow context: `.n8n-cache/workflows/NUDfr0IQSRwTHm1F-business-context.md`
- Airtable field mappings: `.n8n-cache/nodes/extract-metadata.json`

### Learnings from Sibling Projects
- React 19 SSR patterns: `/Users/gabrielmurray/dev/whyitshot/docs/solutions/runtime-errors/react19-ssr-lifecycle-patterns.md`
- Airtable API optimization: `/Users/gabrielmurray/dev/offermanagement/docs/solutions/performance-issues/image-and-api-optimization.md`
- Next.js API security: `/Users/gabrielmurray/dev/whyitshot/docs/solutions/security-issues/nextjs-16-api-security-hardening.md`
- React conditional form patterns: `/Users/gabrielmurray/dev/hunts/docs/solutions/react-patterns/010-react-review-fixes.md`

### External
- Airtable Web API: https://airtable.com/developers/web/api/introduction
- React Hook Form: https://react-hook-form.com
- Zod: https://zod.dev
