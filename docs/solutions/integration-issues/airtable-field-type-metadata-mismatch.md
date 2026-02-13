---
title: "Airtable Form Field Type Misdiscovery: Visual UI vs API Metadata Mismatch"
problem_type: integration-issues
component: airtable-form-replication
symptoms:
  - Form fields rendered with wrong component types
  - LinkedRecordPicker used where MultiSelect was needed
  - Search queries failing for fields that are actually select lists
  - Incorrect display field names for linked record tables
root_cause: Airtable form UI obscures actual field types; visual inspection alone leads to wrong assumptions
technologies:
  - Airtable REST API
  - Airtable Metadata API
  - Next.js
  - TypeScript
  - React Hook Form
date_resolved: 2026-02-11
severity: medium
---

# Airtable Form Field Type Misdiscovery

## Problem

When replicating an Airtable form as a custom web application, field types were incorrectly assumed based on visual UI appearance. Several fields that appeared to be linked records in the Airtable form interface were actually `multipleSelects`, and linked record tables had different display field names than expected.

### Symptoms

- `Tag Presets`, `Restrictions (Buyer Type)`, and `Restrictions (Region)` were built as `LinkedRecordPicker` components (with debounced search against Airtable tables) when they should have been `MultiSelect` dropdowns with static option lists
- `Seller` table display field assumed to be `"Name"` but was actually `"Seller"`
- `Companies` table display field assumed to be `"Name"` but was actually `"ID"`
- `Brand Partner` linked to `"Admins"` table, not a `"Brand Partners"` table
- `Lead Time Interval` used `"Day(s)"` format, not `"Days"`
- Currency options were incomplete (5 instead of 11)

## Root Cause

Airtable's form interface renders `multipleSelects` and `multipleRecordLinks` identically — both appear as searchable tag-style pickers. Without querying the metadata API, there is no reliable way to distinguish these field types from the UI alone.

## Solution

### Step 1: Query the Airtable Metadata API

The metadata API reveals the actual field type for every field in every table:

```
GET https://api.airtable.com/v0/meta/bases/{baseId}/tables
Authorization: Bearer {pat}
```

### Step 2: Inspect Field Types

Look at the `type` property for each field. The critical distinction:

| Airtable `type` | Correct Component | Notes |
|---|---|---|
| `multipleRecordLinks` | `LinkedRecordPicker` (search against linked table) | Has `linkedTableId` in options |
| `multipleSelects` | `MultiSelect` (static options list) | Has `choices` array in options |
| `singleSelect` | `SelectDropdown` or `RadioGroup` | Has `choices` array |
| `singleLineText` | `TextInput` | |
| `multilineText` | `TextArea` | |
| `checkbox` | `Checkbox` | |
| `number` | `TextInput` with number type | |
| `rating` | `StarRating` | Has `max` in options |

### Step 3: Extract Choice Lists from Metadata

For `multipleSelects` and `singleSelect` fields, the metadata response includes the full set of valid choices:

```typescript
// From metadata response
field.options.choices = [
  { id: "sel...", name: "Choice A", color: "blue" },
  { id: "sel...", name: "Choice B", color: "green" },
  // ...
]
```

Use these to populate your `MultiSelect` or `SelectDropdown` options arrays directly, ensuring parity with the Airtable form.

### Step 4: Verify Linked Record Display Fields

For `multipleRecordLinks` fields, query sample records from the linked table to discover the correct display field name:

```
GET https://api.airtable.com/v0/{baseId}/{tableName}?maxRecords=3
```

Don't assume `"Name"` — tables may use `"Seller"`, `"ID"`, or any other field as the primary display.

## Fields That Were Corrected

| Field | Assumed Type | Actual Type | Fix |
|---|---|---|---|
| Tag Presets | `multipleRecordLinks` | `multipleSelects` | Changed to `MultiSelect` with 5 static options |
| Restrictions (Buyer Type) | `multipleRecordLinks` | `multipleSelects` | Changed to `MultiSelect` with 15 options |
| Restrictions (Region) | `multipleRecordLinks` | `multipleSelects` | Changed to `MultiSelect` with 160+ country options |
| Seller display field | `"Name"` | `"Seller"` | Updated `linked-records.ts` config |
| Companies display field | `"Name"` | `"ID"` | Updated `linked-records.ts` config |
| Brand Partner table | `"Brand Partners"` | `"Admins"` | Updated `linked-records.ts` config |
| Lead Time Interval | `"Days"` etc. | `"Day(s)"` etc. | Updated types, schema, and constants |
| Currency options | 5 currencies | 11 currencies | Added JPY, KRW, UAE, CNY, PLN, CHF |

## Prevention

1. **Always query the metadata API first** when replicating an Airtable base — never rely solely on the form UI appearance
2. **Cross-reference linked tables** by querying sample records to confirm display field names
3. **Extract all select choices** from metadata rather than manually typing them from the UI
4. **Validate enum values** (like lead time intervals) character-for-character against the metadata, including parentheses and capitalization

## Related

- [Itemization form replacement plan](../../plans/2026-02-11-feat-itemization-form-replacement-plan.md)
- [Itemization form brainstorm](../../brainstorms/2026-02-11-itemization-form-brainstorm.md)
- Airtable Metadata API docs: `https://airtable.com/developers/web/api/get-base-schema`
