# Form UX Overhaul — Implementation Plan

**Date:** 2026-02-12
**Brainstorm:** `docs/brainstorms/2026-02-12-form-ux-overhaul-brainstorm.md`
**Status:** Ready for implementation

---

## Build Order (6 phases, dependency-ordered)

### Phase 0: Remove Qualification Section
**Scope:** Trivial, 0 risk, unblocks accurate section count for Phase 1.

**Files:**
- `components/form/ItemizationForm.tsx` — comment out `<QualificationSection />`
- `lib/schema.ts` — comment out `itemizationType` validation (line 60)
- `lib/conditional-logic.ts` — comment out `"itemizationType"` from ALWAYS_VISIBLE set

**Keep intact:** `QualificationSection.tsx`, `ITEMIZATION_TYPE_OPTIONS` in constants, `ItemizationType` type, `itemizationType` in `ItemizationFormData`. Everything stays, just not rendered or validated.

---

### Phase 1: Section-by-Section Flow + Progress Nav
**Scope:** Major structural change. Transforms the form from a single scroll to a stepped layout with free navigation.

**New files:**
- `components/form/FormStepper.tsx` — progress sidebar/nav component
- `components/form/SectionContainer.tsx` — wrapper that handles section visibility + transitions

**Modified files:**
- `components/form/ItemizationForm.tsx` — major rewrite:
  - Add `currentSection` state (number, 0-indexed)
  - Define `SECTIONS` array: `[{ id, title, component, fields[] }]` — each entry maps to a section component and its field names (for completion tracking)
  - Render `FormStepper` + only the active `SectionContainer`
  - Add `next()`, `prev()`, `goTo(index)` navigation functions
  - Move submit button to only show on the last section
  - Change validation mode: keep `onBlur` for field-level, but trigger `handleSubmit` only on final submit from last section
- `app/globals.css` — new styles for stepper, section transitions, layout

**FormStepper design:**
- Vertical sidebar on desktop (left side), horizontal top bar on mobile
- Each step shows: section title, completion indicator (checkmark / warning / empty)
- Completion = all required fields in that section have values (check via `watch()`)
- Active section highlighted with accent color
- Clickable — any section, any time (permissive navigation)
- Smooth progress line connecting steps

**SectionContainer design:**
- Wraps each section component
- Handles enter/exit animations (CSS `@keyframes` slide + fade)
- Direction-aware: sliding left-to-right when advancing, right-to-left when going back

**Layout change:**
- Form container becomes a flex layout: `[sidebar (220px)] [content (flex-1)]`
- Max-width increases from 720px to 960px to accommodate sidebar
- Mobile: sidebar collapses to horizontal step indicators at top

**Section definitions (7 active sections):**
```
0: Primary Details     — brandPartner, seller, newSellerId, inventoryFile, additionalFiles, inventoryType
1: Grading Details     — productAssortment, inventoryCondition, overallListingRating, + conditional surplus/wholesale scales
2: Inventory Details   — categoryGroups, inventoryExclusivity, paperwork, tagPresets, allTags, inventoryNotes
3: Location            — region, state, city
4: Logistics           — minimumOrder, packagingType, packagingDetails, inventoryAvailability, fobOrExw, leadTimeNumber, leadTimeInterval
5: Pricing             — currencyType, inlandFreight, marginTakeRate, priceColumns, + conditional sub-fields
6: Restrictions        — listingDisaggregation, customDisaggregation, stealth, restrictionsString, restrictionsCompany, restrictionsBuyerType, restrictionsRegion, p0FireListing, notes
```

**Navigation controls:**
- Bottom of each section: "Next" button (right-aligned), "Back" button (left-aligned, hidden on first section)
- Keyboard: Enter advances (when not in textarea), Shift+Tab goes back (optional stretch)

---

### Phase 2: Selector Component Overhaul
**Scope:** New `SearchableMultiSelect` component + visual polish on existing selectors.

**New files:**
- `components/form/fields/SearchableMultiSelect.tsx` — hybrid search + pinned picks component

**Modified files:**
- `components/form/sections/RestrictionsListing.tsx` — swap `MultiSelect` → `SearchableMultiSelect` for `restrictionsRegion` and `restrictionsBuyerType`
- `components/form/sections/LocationSection.tsx` — swap `SelectDropdown` → `SearchableMultiSelect` (single-select mode) for `region` field (200+ countries deserves search)
- `components/form/fields/RadioGroup.tsx` — visual polish
- `components/form/fields/RadioScale.tsx` — visual polish
- `components/form/fields/MultiSelect.tsx` — visual polish for small sets (Category Groups, Tag Presets)
- `app/globals.css` — new styles for SearchableMultiSelect, polished pill styles

**SearchableMultiSelect design:**
- **Pinned picks:** Top row of pill buttons for the most common options (configurable per field)
  - `restrictionsRegion` pins: United States, Canada, United Kingdom, Germany, France, Australia
  - `restrictionsBuyerType` pins: Brick and mortar, Online, Reseller, Wholesale, Distributor
  - `region` pins: United States, Canada, United Kingdom, Germany (single-select mode)
- **Search input:** Below pins, with search icon. Filters the full option list as you type
- **Dropdown results:** Appears below search input, max 8 visible results, scrollable
- **Selected tags:** Displayed as dismissible pills above the component (multi-mode) or replaces the search input text (single-mode)
- **Props:** `name`, `label`, `options: string[]`, `pinnedOptions: string[]`, `mode: "single" | "multi"`, `required?`, `placeholder?`
- **Empty state:** "No matching options" when search yields nothing
- **Animation:** Dropdown slides in with fade, pills animate in with scale

**Pill styling improvements (RadioGroup + RadioScale):**
- Consistent pill sizing: `min-width: fit-content`, uniform padding `0.5rem 1rem`
- Scale pills: render as a connected row (no gap between them, shared border-radius on ends only) to read as a single unit
- Add subtle scale transform on hover (`transform: scale(1.02)`)
- Add `transform: scale(0.97)` press feedback on click
- Selected state: add subtle box-shadow glow matching the pill color

**MultiSelect polish (small sets):**
- Replace plain checkboxes with pill-style toggles matching the RadioGroup aesthetic
- Selected pills get accent background, unselected stay muted
- Consistent sizing with RadioGroup pills

---

### Phase 3: Linked Record Picker — Rich Preview
**Scope:** Upgrade the linked record dropdown from plain text to rich preview cards with smart sorting.

**Modified files:**
- `lib/linked-records.ts` — extend config with preview fields and sort options
- `app/actions/fetch-options.ts` — update `searchLinkedRecords` to return extra fields, accept sort parameter
- `components/form/fields/LinkedRecordPicker.tsx` — rich dropdown rendering, skeleton loading
- `lib/types.ts` — extend `LinkedRecord` interface with metadata fields
- `app/globals.css` — rich picker card styles, skeleton shimmer

**LinkedRecordConfig extension:**
```typescript
export interface LinkedRecordConfig {
  table: string;
  displayField: string;
  mode: "single" | "multi";
  previewFields?: string[];    // additional fields to fetch and display
  sortField?: string;          // field to sort by
  sortDirection?: "asc" | "desc";
}
```

**Updated config:**
```typescript
brandPartner: {
  table: "Admins", displayField: "Name", mode: "single",
  previewFields: ["Email", "Role"],
  sortField: "Name", sortDirection: "asc"
},
seller: {
  table: "Sellers", displayField: "Seller", mode: "single",
  previewFields: ["Company", "Status"],
  sortField: "Created", sortDirection: "desc"  // most recent first
},
restrictionsCompany: {
  table: "Companies", displayField: "ID", mode: "multi",
  previewFields: ["Name", "Category"],
  sortField: "Name", sortDirection: "asc"
}
```

**Note:** The exact `previewFields` depend on what columns actually exist in the Airtable tables. These are educated guesses based on typical patterns. The admin panel (Phase 5) will make it easy to discover and adjust these.

**Rich dropdown item design:**
- Primary line: display field value (bold, `--text` color)
- Secondary line: preview fields as `key: value` pairs, muted text
- Hover: subtle highlight with left accent border
- Selected (in multi mode): checkmark icon, slightly different bg

**Skeleton loading:**
- While searching, show 3 skeleton cards (pulsing gradient animation)
- Replace the current "Searching..." text

**searchLinkedRecords update:**
- Accept `fields: string[]` parameter (displayField + previewFields)
- Accept `sort: { field: string, direction: "asc" | "desc" }` parameter
- Return full field data, not just id + name
- Increase maxRecords to 50 for richer browsing

**LinkedRecord type extension:**
```typescript
export interface LinkedRecord {
  id: string;
  name: string;
  metadata?: Record<string, string>;  // preview field values
}
```

---

### Phase 4: Animations Polish
**Scope:** Elevate the form's feel with tasteful transitions throughout. Pure CSS — no new dependencies.

**Modified files:**
- `app/globals.css` — all animation additions

**Animation inventory:**

1. **Section transitions** (from Phase 1):
   - Forward: current section slides left + fades out, new section slides in from right + fades in
   - Backward: reverse direction
   - Duration: 300ms, ease-out timing
   - CSS: `@keyframes slideInRight`, `slideOutLeft`, `slideInLeft`, `slideOutRight`

2. **Conditional field reveals** (upgrade existing):
   - Current: `fadeSlideIn 0.2s` (opacity + translateY)
   - New: add `max-height` transition for smoother layout shift (prevents content below from jumping)
   - Duration: 250ms

3. **Pill hover micro-interactions:**
   - Hover: `transform: translateY(-1px)`, subtle `box-shadow` elevation
   - Active/press: `transform: translateY(0) scale(0.98)`
   - Selected glow: `box-shadow: 0 0 0 2px color-mix(in srgb, var(--pill-color) 30%, transparent)`

4. **Progress stepper animations:**
   - Active step: pulsing dot or accent-colored indicator
   - Completed step: checkmark scales in from 0
   - Progress line: `width` transition fills between completed steps
   - Duration: 200ms per step transition

5. **Selected state feedback:**
   - Radio pills: brief scale bounce on select (`scale(1.05)` → `scale(1)`, 150ms)
   - Multi-select pills: scale-in animation when added, scale-out when removed
   - Star rating: sequential star fill animation (each star 50ms delayed)

6. **Loading states:**
   - Linked record skeleton: shimmer gradient animation (`@keyframes shimmer` — moving highlight across grey bg)
   - Submit button: loading spinner replaces text

7. **Success screen:**
   - Checkmark draws in (SVG stroke-dashoffset animation)
   - Text fades in with slight upward slide, 200ms delay after checkmark

8. **Focus transitions:**
   - Input focus: border color transition 150ms (already exists) + subtle `box-shadow` ring

---

### Phase 5: Airtable Dev Admin Panel
**Scope:** New `/admin` route with field browser, mapping view, and auto-generate sync.

**New files:**
- `app/admin/page.tsx` — admin panel page component
- `app/admin/layout.tsx` — separate layout (no form styles)
- `app/api/admin/schema/route.ts` — GET endpoint that fetches Airtable base schema via metadata API
- `app/api/admin/sync/route.ts` — POST endpoint that generates and writes the field mapping
- `lib/airtable-meta.ts` — Airtable metadata API client (separate from record CRUD)

**Modified files:**
- `lib/constants.ts` — the `AIRTABLE_FIELD_MAP` and multi-select option arrays become the sync targets

**Airtable Metadata API:**
- Endpoint: `GET https://api.airtable.com/v0/meta/bases/{baseId}/tables`
- Returns: all tables, their fields (name, type, options for select fields)
- Auth: same PAT as existing

**Admin panel UI:**

**Tab 1: Field Browser**
- Table selector dropdown (shows all tables in the base)
- Field list for selected table:
  - Field name, field type, options (for select/multiselect fields)
  - Visual type badges (text, number, select, linked record, etc.)
  - Search/filter input at top

**Tab 2: Mapping View**
- Two-column layout: Airtable fields (left) ↔ Form fields (right)
- Mapped fields: green indicator, connected line
- Unmapped Airtable fields: grey, available for mapping
- Unmapped form fields: yellow warning
- Click an unmapped field to see a copy-ready code snippet

**Tab 3: Sync**
- "Sync from Airtable" button
- Shows diff preview: what would change in `constants.ts`
- Specifically syncs:
  - Multi-select options (BUYER_TYPE_OPTIONS, TAG_PRESET_OPTIONS, etc.) — reads select field choices from metadata
  - COUNTRY_OPTIONS — if stored as a select field
  - AIRTABLE_FIELD_MAP — adds any new Airtable fields not yet mapped (as comments)
- Confirm button to apply changes
- Implementation: POST to `/api/admin/sync` → reads metadata → generates new constant values → writes to `lib/constants.ts` via `fs.writeFileSync`

**Sync safety:**
- Only appends/updates, never removes existing mappings
- New unmapped fields added as commented-out lines: `// newFieldName: "New Field Name", // TODO: add to form`
- Multi-select options: full replace (source of truth is Airtable)
- Shows a diff preview before applying
- Generates a timestamped backup of constants.ts before overwriting

---

## Dependency Graph

```
Phase 0 (Qualification removal)
  ↓
Phase 1 (Section flow + stepper)  ←  No deps besides Phase 0
  ↓
Phase 2 (Selector overhaul)       ←  Sections must exist for context
  ↓ (can parallel with Phase 3)
Phase 3 (Linked record upgrade)   ←  Independent of Phase 2
  ↓
Phase 4 (Animations)              ←  All components must be in final form
  ↓ (can parallel with Phase 5)
Phase 5 (Admin panel)             ←  Independent of UI phases
```

**Parallelizable pairs:**
- Phase 2 + Phase 3 (different components, no overlap)
- Phase 4 + Phase 5 (CSS polish vs. new route, no overlap)

---

## New Dependencies

**None.** All animations use vanilla CSS (keyframes, transitions). No Framer Motion needed — the animation requirements are achievable with CSS alone and keep the bundle small.

---

## Files Summary

**New files (8):**
- `components/form/FormStepper.tsx`
- `components/form/SectionContainer.tsx`
- `components/form/fields/SearchableMultiSelect.tsx`
- `app/admin/page.tsx`
- `app/admin/layout.tsx`
- `app/api/admin/schema/route.ts`
- `app/api/admin/sync/route.ts`
- `lib/airtable-meta.ts`

**Modified files (14):**
- `components/form/ItemizationForm.tsx` (major rewrite)
- `components/form/FormSection.tsx` (minor — may add transition props)
- `components/form/fields/RadioGroup.tsx` (visual polish)
- `components/form/fields/RadioScale.tsx` (visual polish)
- `components/form/fields/MultiSelect.tsx` (pill-style upgrade)
- `components/form/fields/LinkedRecordPicker.tsx` (rich preview cards)
- `components/form/sections/RestrictionsListing.tsx` (use SearchableMultiSelect)
- `components/form/sections/LocationSection.tsx` (use SearchableMultiSelect for region)
- `lib/linked-records.ts` (extend config)
- `lib/types.ts` (extend LinkedRecord)
- `lib/schema.ts` (comment out qualification)
- `lib/conditional-logic.ts` (comment out qualification)
- `lib/constants.ts` (sync target for admin panel)
- `app/globals.css` (extensive additions)
- `app/actions/fetch-options.ts` (richer search)

**Untouched (kept for recovery):**
- `components/form/sections/QualificationSection.tsx`
