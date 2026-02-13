---
title: "feat: Submission Efficiency — Carry-Forward, History, and Templates"
type: feat
date: 2026-02-12
deepened: 2026-02-12
brainstorm: docs/brainstorms/2026-02-12-submission-efficiency-brainstorm.md
---

# feat: Submission Efficiency — Carry-Forward, History, and Templates

## Enhancement Summary

**Deepened on:** 2026-02-12
**Research agents used:** TypeScript reviewer, Performance oracle, Security sentinel, Code simplicity reviewer, Frontend races reviewer, Architecture strategist, Pattern recognition specialist, Best practices researcher, Framework docs researcher, Learnings researcher, Frontend design

### Key Improvements from Research
1. Simplified file structure: 4 new files → 1 new file + modifications to 4 existing
2. Critical pre-requisite: fix bare `watch()` calls causing O(all fields) re-renders on every keystroke
3. Scrub conditional fields BEFORE `reset()` (1 render) instead of after (11 renders)
4. Use `key` prop for LinkedRecordPicker remount instead of error-prone useEffect sync
5. Simplified data shapes: removed wrapper types, added schema version, typed keys
6. Distinctive drawer design: 340px overlay, segmented toggle, hover-reveal actions, undo toast

### New Risks Discovered
- Pre-existing stale-response bug in LinkedRecordPicker `doSearch` (no generation counter)
- `watch()` without arguments in 3 section components causes 3x unnecessary re-renders per keystroke
- React 19 can auto-memoize `watch()` calls; prefer `useWatch()` for side effects

---

## Overview

Repeat submitters fill out ~40 fields but typically change only 1-5 between submissions. Currently every submission resets to blank. This plan adds three localStorage-based features to eliminate that friction: smart carry-forward on resubmit, auto-saved submission history, and named reusable templates.

## Problem Statement

The form has zero persistence. "Submit Another" wipes everything via `methods.reset(FORM_DEFAULTS)`. Users in a known group on consistent machines submit similar forms repeatedly — same seller, same brand partner, same logistics, different inventory file and maybe a few tweaks. They re-enter 35+ identical fields every time. This is the single biggest friction point.

## Proposed Solution

Three features, all localStorage-based, no backend changes:

1. **Smart "Submit Another"** — success screen shows section-level keep/clear checklist. Default: keep all. Files always clear.
2. **Auto-saved history** — every successful submission auto-saves to localStorage (last 20, FIFO). Accessible from form UI for cloning.
3. **Named templates** — save current form state as a named template. Load/delete from form UI.

UI for history and templates lives in a 340px slide-out drawer triggered by a button in the stepper sidebar.

## Technical Approach

### Architecture (Simplified)

```
localStorage
├── submitalot:history    → HistoryEntry[] (max 20, FIFO)
└── submitalot:templates  → Template[] (max 50, user-managed)

lib/
├── storage.ts            → localStorage CRUD, types, serialization, carry-forward merge
└── conditional-logic.ts  → add scrubOrphanedFields() helper (10 lines)

lib/constants.ts          → add SECTION_FIELD_MAP (all fields per section)

components/form/
├── ItemizationForm.tsx   → Modified success screen, carry-forward logic, drawer state
├── HistoryDrawer.tsx     → Slide-out drawer (history + templates, inline save input)
├── FormStepper.tsx       → Boolean fix, drawer trigger button
└── fields/LinkedRecordPicker.tsx → initialRecords prop, stale-response fix
```

**Eliminated from original plan:**
- ~~`lib/section-fields.ts`~~ → `SECTION_FIELD_MAP` goes in `constants.ts` (where all field constants live)
- ~~`SaveTemplateDialog.tsx`~~ → inline text input in drawer (not worth a separate component)

### Types

```typescript
// lib/storage.ts

// Constrained to known linked record field names
type LinkedRecordFieldName = keyof typeof LINKED_RECORD_FIELDS;
// = "brandPartner" | "seller" | "restrictionsCompany"

type SectionId = "primary" | "grading" | "inventory" | "location" | "logistics" | "pricing" | "restrictions";

interface StoredSubmission {
  version: 1;
  formData: Partial<ItemizationFormData>;
  linkedRecords: Partial<Record<LinkedRecordFieldName, LinkedRecord[]>>;
}

interface HistoryEntry {
  id: string;                       // crypto.randomUUID()
  timestamp: number;                // Date.now()
  data: StoredSubmission;
}
// Preview (brandPartner, seller, inventoryType) computed at render time
// from data.formData — no duplication

interface Template {
  id: string;
  name: string;
  createdAt: number;
  data: StoredSubmission;
}
// No updatedAt — there's no edit feature. YAGNI.
```

**Changes from original plan:**
- `linkedRecords` stores `LinkedRecord[]` directly (not a wrapper with `value` + `records`)
- Keys constrained to `LinkedRecordFieldName` (not `Record<string, ...>`)
- `HistoryEntry.preview` removed (computed at render time from `formData`)
- `Template.updatedAt` removed (no edit feature)
- `version: 1` added for future schema migration

### Key Implementation Details

**0. Pre-requisites (fix before starting)**

Two pre-existing issues that this plan will amplify:

**A. Fix bare `watch()` calls** in `PrimaryDetails.tsx:16`, `GradingDetails.tsx:24`, `PricingSection.tsx:20`. Currently `const formState = watch()` subscribes to ALL 42 fields. Every keystroke triggers 3 extra section re-renders. Replace with targeted watches:

```typescript
// PrimaryDetails — only needs inventoryType and seller
const inventoryType = watch("inventoryType");
const seller = watch("seller");

// GradingDetails — only needs inventoryType
const inventoryType = watch("inventoryType");

// PricingSection — needs priceColumns, flatOrReference
const priceColumns = watch("priceColumns");
const flatOrReference = watch("flatOrReference");
```

**B. Fix stale-response bug in LinkedRecordPicker `doSearch`** (`LinkedRecordPicker.tsx:49-63`). If "Nik" response arrives after "Nike" response, stale results overwrite correct ones. Add a generation counter:

```typescript
const searchGenRef = useRef(0);
const doSearch = useCallback(async (q: string) => {
  const gen = ++searchGenRef.current;
  setLoading(true);
  try {
    const data = await searchLinkedRecords(...);
    if (gen !== searchGenRef.current) return; // stale, discard
    setResults(data);
  } catch {
    if (gen !== searchGenRef.current) return;
    setResults([]);
  } finally {
    if (gen === searchGenRef.current) setLoading(false);
  }
}, [...]);
```

**1. Section-to-fields mapping**

Add `SECTION_FIELD_MAP` to `lib/constants.ts` (where all field constants live). Use `satisfies` for compile-time safety:

```typescript
export const SECTION_FIELD_MAP = {
  primary: ["brandPartner", "seller", "newSellerId", "inventoryFile", "additionalFiles", "inventoryType"],
  grading: ["productAssortment", "inventoryCondition", "overallListingRating", "pricingStrengthSurplus", "pricingStrengthWholesale", "brandDemandSurplus", "brandDemandWholesale", "locationSurplus", "locationWholesale", "restrictionsSurplus", "restrictionsWholesale"],
  inventory: ["categoryGroups", "inventoryExclusivity", "paperwork", "tagPresets", "allTags", "inventoryNotes"],
  location: ["region", "state", "city"],
  logistics: ["minimumOrder", "packagingType", "packagingDetails", "inventoryAvailability", "fobOrExw", "leadTimeNumber", "leadTimeInterval"],
  pricing: ["currencyType", "inlandFreight", "marginTakeRate", "priceColumns", "sellerPriceColumn", "buyerPriceColumn", "flatOrReference", "referencePriceColumn", "increaseOrDecrease", "maxPercentOffAsking"],
  restrictions: ["listingDisaggregation", "customDisaggregation", "stealth", "restrictionsString", "restrictionsCompany", "restrictionsBuyerType", "restrictionsRegion", "p0FireListing", "notes"],
} as const satisfies Record<SectionId, readonly FormFieldName[]>;
```

Then derive `requiredFields` in the `SECTIONS` array from `SECTION_FIELD_MAP` to avoid two sources of truth.

**2. Linked record hydration — key-based remount**

Do NOT use `useEffect` to sync `initialRecords` into local state — this creates the "derived state from props" antipattern with a flash of stale content.

Instead, use a `key` prop to force full remount when loading saved data:

```tsx
<LinkedRecordPicker
  key={`brandPartner-${loadGeneration}`}
  name="brandPartner"
  initialRecords={linkedRecordState.brandPartner}
/>
```

Where `loadGeneration` is a counter incremented on every `reset()` from history/template/carry-forward. The `key` change unmounts the old instance and mounts a fresh one with `initialRecords` as the initial `useState` value:

```typescript
// In LinkedRecordPicker
const [selectedRecords, setSelectedRecords] = useState<LinkedRecord[]>(
  initialRecords ?? []
);
```

No effect, no sync, no race. The cost of remounting 3 picker components is negligible.

**3. Conditional field scrubbing — BEFORE reset, not after**

Scrub orphaned conditional fields in the data object BEFORE passing to `reset()`. This avoids a render storm (1 reset + ~10 resetField calls = 11 renders → just 1 render):

```typescript
// In lib/conditional-logic.ts — add this helper
const CONDITIONAL_SCRUB_ORDER: FormFieldName[] = [
  "inventoryType", "seller", "priceColumns", "flatOrReference", "listingDisaggregation",
];

export function scrubOrphanedFields(data: Partial<ItemizationFormData>): Partial<ItemizationFormData> {
  const scrubbed = { ...data };
  for (const parent of CONDITIONAL_SCRUB_ORDER) {
    const value = scrubbed[parent];
    if (typeof value === "string") {
      const toClear = getFieldsToClear(parent, value);
      for (const field of toClear) {
        delete scrubbed[field];
      }
    }
  }
  return scrubbed;
}
```

Then the carry-forward handler becomes a single `reset()` call:

```typescript
const scrubbed = scrubOrphanedFields(mergedData);
methods.reset(scrubbed as ItemizationFormData);
```

**4. File field exclusion**

`inventoryFile` and `additionalFiles` always stripped from stored data. They use blob URLs that don't persist. On carry-forward, files always clear regardless of section keep/clear selection.

**5. Boolean completion bug fix**

`FormStepper.tsx` line 36: change `if (typeof value === "boolean") return dirty;` to `if (typeof value === "boolean") return true;`. A boolean always has a valid value. `stealth` and `p0FireListing` both default to `false` which is intentional.

**6. History auto-save — use `data` param, not `getValues()`**

In `onSubmit(data)`, the `data` parameter is a frozen snapshot from react-hook-form. Use it directly for `saveHistory()`. Do NOT call `getValues()` which reads the live form store:

```typescript
async function onSubmit(data: ItemizationFormData) {
  setSubmitting(true);
  try {
    const res = await fetch("/api/submit", { ... });
    if (!res.ok) { ... }
    saveHistory(data);           // frozen snapshot, safe
    setSubmitted(true);          // shows success screen
  } catch (err) { ... }
  finally { setSubmitting(false); }
}
```

**7. Carry-forward handler — `setSubmitted(false)` must be last**

```typescript
function handleCarryForward(keptSections: SectionId[]) {
  const merged = buildCarryForwardValues(lastSubmittedData, keptSections);
  const scrubbed = scrubOrphanedFields(merged);
  methods.reset(scrubbed as ItemizationFormData);
  setLoadGeneration(g => g + 1);   // triggers picker remount via key
  setCurrentSection(0);
  setSubmitted(false);              // LAST — this shows the form
}
```

**8. Storage availability check**

Safari in private browsing throws on `localStorage.setItem` after ~0 bytes. Check once and cache:

```typescript
function isStorageAvailable(): boolean {
  try {
    const test = "__submitalot_test__";
    localStorage.setItem(test, "1");
    localStorage.removeItem(test);
    return true;
  } catch { return false; }
}
```

If unavailable, hide the drawer trigger button and skip the success screen checklist. Features degrade gracefully — the form still works normally.

**9. Validate parsed data shape**

```typescript
function safeParseHistory(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is HistoryEntry =>
        typeof e === "object" && e !== null &&
        typeof e.id === "string" &&
        typeof e.timestamp === "number" &&
        typeof e.data?.formData === "object"
    );
  } catch { return []; }
}
```

**10. Strip metadata from linked records before storing**

Only store `{ id, name }` per linked record. Don't persist `metadata` (Email, Company, Status) — that's for picker dropdown display only:

```typescript
function stripMetadata(records: LinkedRecord[]): LinkedRecord[] {
  return records.map(({ id, name }) => ({ id, name }));
}
```

### Drawer Design

**Layout:** 340px overlay from left, z-index above sidebar. Does not push content.

**Sections:** Segmented toggle at top with counts: `[Recent (12) | Templates (3)]`. Single scrollable body underneath — no nested scroll regions.

**Animation:**
- Open: slide-left with slight overshoot, 280ms, `cubic-bezier(0.16, 1.2, 0.3, 1)`
- Close: quick exit, 200ms, `cubic-bezier(0.4, 0, 0.7, 1)`
- Use `data-open` attribute, not class toggle

**History entries:**
- Grid layout: primary line (bold, brand/seller) + secondary line (muted, type + relative time) | clone button
- Clone button: hover-reveal on desktop, always visible on touch devices
- Secondary format: `"Discount · 3h ago"` — type first (differentiator), middle dot, relative time

**Template entries:**
- Same grid layout, name as primary line, two action buttons (load + delete)
- Delete: immediate with 4-second undo toast at bottom of drawer (no confirmation dialog)

**Save template:** "Save Current" button at top of templates section. Expands inline into text input + save button on click. Enter to save, Escape to cancel. Sticky with backdrop-filter blur.

**Scroll:** Simple `overflow-y: auto` with CSS edge fade masks (gradient mask-image). No virtual scroll needed for <50 items.

**Mobile (< 768px):** Full-screen sheet that slides up from bottom (more natural on mobile). No backdrop needed — it's full screen.

**Accessibility:** `prefers-reduced-motion` media query disables all animations.

```css
@media (prefers-reduced-motion: reduce) {
  .drawer-panel, .drawer-backdrop { transition: none; }
}
```

### Implementation Phases

#### Phase 0: Pre-requisites — Fix Existing Issues

**Files to modify:**
- `components/form/sections/PrimaryDetails.tsx` — targeted `watch()` calls
- `components/form/sections/GradingDetails.tsx` — targeted `watch()` calls
- `components/form/sections/PricingSection.tsx` — targeted `watch()` calls
- `components/form/fields/LinkedRecordPicker.tsx` — stale-response guard

**Why first:** The bare `watch()` pattern causes 3x unnecessary re-renders per keystroke across the form. The plan's `reset()` calls will amplify this into a render storm. Fix before building on top.

**Success criteria:**
- [x] Each section component only watches the specific fields it needs for conditional logic
- [x] LinkedRecordPicker discards stale search responses via generation counter

#### Phase 1: Foundation — Storage Layer + Constants

**Files to create:**
- `lib/storage.ts` — localStorage CRUD with try/catch, types, serialization, carry-forward merge logic (~80 lines)

**Files to modify:**
- `lib/constants.ts` — add `SECTION_FIELD_MAP`
- `lib/conditional-logic.ts` — add `scrubOrphanedFields()` helper (~10 lines)

**Functions in storage.ts:**
- `isStorageAvailable()` — check + cache
- `saveHistory(data, linkedRecords)` — strip files, strip metadata, prepend, cap at 20
- `getHistory()` — safe parse with shape validation
- `saveTemplate(name, data, linkedRecords)` — strip files/metadata, cap at 50
- `getTemplates()` — safe parse
- `deleteTemplate(id)` — remove by ID
- `buildCarryForwardValues(lastData, keptSections)` — merge kept sections with FORM_DEFAULTS

**Return type contract:**
- `getHistory()` / `getTemplates()` always return arrays (never undefined/null)
- `saveHistory()` / `saveTemplate()` return `boolean` (true=success, false=storage error)

**Success criteria:**
- [x] All localStorage ops wrapped in try/catch with graceful fallbacks
- [x] `SECTION_FIELD_MAP` covers every field in every section
- [x] `satisfies` enforces field names at compile time
- [x] File fields excluded from stored data
- [x] Linked record metadata stripped before storing
- [x] Shape validation on parse (not just JSON syntax)
- [x] `scrubOrphanedFields()` is a pure function, testable in isolation

#### Phase 2: Smart "Submit Another" — Carry-Forward

**Files to modify:**
- `components/form/ItemizationForm.tsx` — new success screen with section checklist, auto-save on submit
- `components/form/fields/LinkedRecordPicker.tsx` — add `initialRecords` prop
- `components/form/FormStepper.tsx` — fix boolean completion check

**Carry-forward flow:**
1. `onSubmit(data)` succeeds → `saveHistory(data, linkedRecordState)` → `setLastSubmittedData(data)` → `setSubmitted(true)`
2. Success screen shows 7-section checklist (all default to "keep")
3. User toggles sections. "Start Fresh" link unchecks all.
4. "Submit Another" → `buildCarryForwardValues()` → `scrubOrphanedFields()` → `methods.reset()` → increment `loadGeneration` → `setCurrentSection(0)` → `setSubmitted(false)`

**LinkedRecordPicker changes:**
- Add optional `initialRecords?: LinkedRecord[]` prop
- Initialize `selectedRecords` state from it: `useState(initialRecords ?? [])`
- Use `key={name-${loadGeneration}}` on all picker instances for clean remount

**Success criteria:**
- [x] Section checklist renders with all 7 sections
- [x] Keep/clear toggles work correctly
- [x] Carried-forward data populates form including linked record pickers
- [x] File fields always empty after carry-forward
- [x] Conditional fields scrubbed before reset (single render, no resetField calls)
- [x] Boolean completion status correct after reset
- [x] History auto-saves on successful submission using `data` param
- [x] `setSubmitted(false)` is last call in carry-forward handler

#### Phase 3: History Drawer + Template Management

**Files to create:**
- `components/form/HistoryDrawer.tsx` — single component for both history and templates

**Files to modify:**
- `components/form/ItemizationForm.tsx` — drawer state, load/clone handlers
- `components/form/FormStepper.tsx` — drawer trigger button at top
- `app/globals.css` — drawer styles, animations, segmented toggle, entry styles, toast

**Drawer behavior:**
- Triggered by button in stepper sidebar
- 340px overlay from left, backdrop click or X to close
- Segmented toggle: `[Recent (N) | Templates (N)]`
- Lazy-load: read from localStorage on drawer open, not on mount

```typescript
const history = useMemo(
  () => drawerOpen ? getHistory() : [],
  [drawerOpen]
);
```

**History entries:** Grid: bold primary (brand/seller), muted secondary (type · relative time), hover-reveal clone button. Clone loads form with confirmation if mid-fill.

**Template entries:** Grid: bold name, load + delete buttons. Delete is immediate with 4s undo toast.

**Save template:** Inline input at top of templates section. Expand on click, Enter to save, Escape to cancel. On duplicate name: silent overwrite.

**Mobile:** Full-screen sheet from bottom at < 768px.

**CSS notes:** Use existing CSS custom properties (`--bg-elevated`, `--border`, `--text-primary`, etc.). Comment headers for new sections. `prefers-reduced-motion` guard on all animations.

**Success criteria:**
- [x] Drawer opens/closes with animation (280ms/200ms)
- [x] Segmented toggle switches between Recent and Templates
- [x] History entries display with correct preview (computed from formData)
- [x] Clone loads form data with linked record hydration via key remount
- [x] Templates can be saved (inline input), loaded, and deleted (undo toast)
- [x] Lazy-loads data on drawer open
- [x] Mobile-responsive (full-screen sheet from bottom)
- [x] Uses existing CSS custom properties
- [x] `prefers-reduced-motion` disables animations

## Acceptance Criteria

### Functional Requirements

- [ ] "Submit Another" shows section-level keep/clear checklist (default: keep all)
- [ ] Clearing a section resets only that section's fields to defaults
- [ ] File uploads always clear regardless of section selection
- [ ] Every successful submission auto-saves to localStorage history (max 20, FIFO)
- [ ] History entries show identifiable preview (brand partner, seller, type, time)
- [ ] Cloning from history populates all fields including linked record pickers
- [ ] Users can save named templates from current form state (max 50)
- [ ] Users can load and delete templates (with undo)
- [ ] Loading history/template over existing form data shows confirmation
- [ ] Conditional fields scrubbed when loading saved data
- [ ] All localStorage operations fail gracefully (no crashes on quota, corruption, or disabled storage)
- [ ] Features hidden when localStorage unavailable (Safari private browsing)

### Non-Functional Requirements

- [ ] No new API calls — all features are client-side only
- [ ] localStorage usage stays well under 1MB for typical usage
- [ ] Drawer animations smooth (CSS transitions, no layout thrash)
- [ ] Works on mobile (drawer becomes full-screen sheet from bottom)
- [ ] `prefers-reduced-motion` respected
- [ ] Section components only watch specific fields (no bare `watch()`)
- [ ] LinkedRecordPicker discards stale search responses

## Dependencies & Prerequisites

- **Phase 0 must complete first** — the bare `watch()` and stale-response fixes are pre-requisites
- No backend changes needed
- The existing form architecture provides all the hooks needed

## Risk Analysis & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| `watch()` render storm on `reset()` | Form freezes briefly on carry-forward/clone | **Phase 0:** Replace bare `watch()` with targeted field watches |
| LinkedRecordPicker shows empty after data load | Pickers display no selections despite having data | Use `key` prop + `loadGeneration` counter for clean remount |
| Conditional field orphaning | Stale data submits to Airtable | `scrubOrphanedFields()` runs BEFORE `reset()`, not after |
| stale search responses in LinkedRecordPicker | Wrong search results displayed | Generation counter in `doSearch` discards out-of-order responses |
| localStorage quota exceeded | Save fails | try/catch with boolean return, cap history at 20 and templates at 50 |
| localStorage disabled (Safari private browsing) | Features unavailable | `isStorageAvailable()` check, hide UI when unavailable |
| Corrupted localStorage data | App crash on parse | Shape validation after JSON.parse, discard invalid entries |
| Shared computer exposure | Users see each other's history | Acceptable for 1:1 machines; no action needed |
| Boolean dirty state after reset | Stepper shows wrong completion | Fix boolean check to not depend on dirtyFields |
| Schema evolution | Old history entries missing new fields | `version: 1` field on StoredSubmission for future migration |

## References

### Internal
- Form orchestrator: `components/form/ItemizationForm.tsx`
- Form defaults: `lib/constants.ts:237-252`
- Conditional logic: `lib/conditional-logic.ts`
- Linked record config: `lib/linked-records.ts`
- Section definitions: `components/form/ItemizationForm.tsx:21-64`
- Submit route: `app/api/submit/route.ts`
- Stepper: `components/form/FormStepper.tsx`
- LinkedRecordPicker: `components/form/fields/LinkedRecordPicker.tsx`
- PrimaryDetails watch: `components/form/sections/PrimaryDetails.tsx:16`
- GradingDetails watch: `components/form/sections/GradingDetails.tsx:24`
- PricingSection watch: `components/form/sections/PricingSection.tsx:20`

### Institutional Learnings
- `docs/solutions/security-issues/form-ux-overhaul-airtable-auth-fixes.md` — never unmount sections (hidden+inert), LinkedRecordPicker local state gotchas, formula injection protection
- `docs/solutions/integration-issues/airtable-field-type-metadata-mismatch.md` — field type discovery, verify previewFields via metadata API

### External References
- [react-hook-form reset() API](https://react-hook-form.com/docs/useform/reset) — `reset()` replaces, does not merge; use callback form for partial reset
- [react-hook-form + React 19 compatibility](https://github.com/orgs/react-hook-form/discussions/11832) — `watch()` instability with React compiler, prefer `useWatch()`
- [shouldUnregister + reset behavior](https://github.com/react-hook-form/react-hook-form/issues/3628) — `reset()` with no args reverts to original `defaultValues`, not last `reset()` values

### Brainstorm
- `docs/brainstorms/2026-02-12-submission-efficiency-brainstorm.md`
