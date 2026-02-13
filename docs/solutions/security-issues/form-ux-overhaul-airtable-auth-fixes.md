---
title: "Form UX Overhaul: Security & State Management Fixes"
date: 2026-02-12
category: security-issues
tags:
  - security
  - airtable
  - formula-injection
  - authentication
  - react-state
  - accessibility
  - aria
  - next-js-15
  - react-19
  - react-hook-form
  - stepped-form
severity: critical
components:
  - app/actions/fetch-options.ts
  - app/api/admin/schema/route.ts
  - app/api/admin/sync/route.ts
  - components/form/SectionContainer.tsx
  - components/form/fields/SearchableMultiSelect.tsx
  - components/form/sections/LogisticsSection.tsx
symptoms:
  - Arbitrary Airtable table access via server action parameters
  - Admin API endpoints accessible without authentication in production
  - LinkedRecordPicker selections disappear when navigating between form sections
  - Screen readers misidentify SearchableMultiSelect as plain text input
status: resolved
related:
  - docs/solutions/integration-issues/airtable-field-type-metadata-mismatch.md
  - docs/plans/2026-02-12-form-ux-overhaul-plan.md
  - docs/brainstorms/2026-02-12-form-ux-overhaul-brainstorm.md
---

# Form UX Overhaul: Security & State Management Fixes

During a comprehensive 6-phase form UX overhaul of the submitalot inventory submission app, code review identified 5 issues (2 critical security, 1 high UI bug, 1 medium accessibility, 1 low code quality) that were resolved before shipping.

## Issue 1: Airtable Formula Injection (CRITICAL)

**File:** `app/actions/fetch-options.ts`

### Symptom

The `searchLinkedRecords` server action accepted `table` and `displayField` as client-controlled parameters and interpolated them directly into Airtable filter formulas. A malicious client could pass arbitrary table names to read unauthorized data or craft query strings to break out of the formula context.

### Root Cause

Server actions serialize arguments from the client. The `table` and `displayField` parameters were used directly in string interpolation without validation:

```typescript
// BEFORE (vulnerable)
const filter = query
  ? `SEARCH(LOWER("${query.replace(/"/g, '\\"')}"), LOWER({${displayField}}))`
  : "";
const records = await listRecords(table, { filterFormula: filter });
```

The quote-escaping was also incomplete — backslashes weren't escaped, so `\"` sequences could break out.

### Solution

Added allowlist validation against the `LINKED_RECORD_FIELDS` configuration and sanitized the query string:

```typescript
import { LINKED_RECORD_FIELDS } from "@/lib/linked-records";

const ALLOWED_CONFIGS = new Map(
  Object.values(LINKED_RECORD_FIELDS).map((cfg) => [cfg.table, cfg])
);

export async function searchLinkedRecords(table, displayField, query, ...) {
  const config = ALLOWED_CONFIGS.get(table);
  if (!config || config.displayField !== displayField) {
    throw new Error("Invalid table or display field");
  }
  const sanitized = query.replace(/["\\\n\r]/g, "");
  const filter = sanitized
    ? `SEARCH(LOWER("${sanitized}"), LOWER({${displayField}}))`
    : "";
  // ...
}
```

### Verification

- Valid table/field combinations return results normally
- Non-existent table names throw validation error
- Mismatched table/field combinations throw validation error
- Query strings with quotes, backslashes, or newlines are sanitized

---

## Issue 2: Unauthenticated Admin API Routes (CRITICAL)

**Files:** `app/api/admin/schema/route.ts`, `app/api/admin/sync/route.ts`

### Symptom

Admin endpoints for Airtable schema browsing (`GET /api/admin/schema`) and sync (`POST /api/admin/sync` for preview, `PUT /api/admin/sync` for applying changes including `writeFileSync` to source code) had zero authentication.

### Root Cause

The admin panel was conceived as a "developer tool" during planning, and authentication was not included. However, the routes were accessible in production where `writeFileSync` to `lib/constants.ts` could enable remote code execution or denial of service.

### Solution

Added environment guards at the top of each handler:

```typescript
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  // ... handler logic
}
```

Applied to all three handlers: GET (schema), POST (sync preview), PUT (sync apply).

### Verification

- In development: admin endpoints respond normally
- In production: all admin endpoints return 404
- No schema data or filesystem writes possible outside development

---

## Issue 3: SectionContainer State Loss (HIGH)

**File:** `components/form/SectionContainer.tsx`

### Symptom

Users who selected linked records in Section 1 (PrimaryDetails), navigated to Section 2, then returned to Section 1 would find their LinkedRecordPicker selections visually missing — no pills displayed even though the form value (array of IDs) was preserved by react-hook-form.

### Root Cause

```typescript
// BEFORE (destroys component tree)
if (!isActive) return null;
```

This unmounted inactive sections entirely. While `shouldUnregister: false` preserved react-hook-form values, local `useState` in child components (`selectedRecords`, `query`, `results` in LinkedRecordPicker) was destroyed on unmount and recreated empty on remount.

### Solution

Replaced conditional unmounting with native DOM hiding that preserves the React component tree:

```typescript
// AFTER (preserves component tree and state)
<div
  hidden={!isActive}
  inert={!isActive ? true : undefined}
  // ... other props
>
  {children}
</div>
```

- `hidden` uses native `display: none` without unmounting React components
- `inert` prevents keyboard interaction with hidden sections (accessibility)
- CSS animations re-trigger naturally when `hidden` is removed (element re-enters layout)

### Verification

1. Select linked records in Section 1 (pills visible)
2. Navigate to Section 2
3. Return to Section 1 — selections still visible
4. Tab key does not focus elements in hidden sections
5. Form submission includes all values from all sections

---

## Issue 4: ARIA Combobox Role Placement (MEDIUM)

**File:** `components/form/fields/SearchableMultiSelect.tsx`

### Symptom

Screen readers announced the SearchableMultiSelect as a plain text input with no indication of the dropdown. The combobox pattern was not communicated to assistive technology.

### Root Cause

`role="combobox"` was placed on the wrapper `<div>` instead of the `<input>` element. Per WAI-ARIA 1.2, the combobox role must be on the element that receives focus and keyboard input. Additionally, `role="searchbox"` on the input conflicted.

### Solution

Moved ARIA attributes from wrapper div to input:

```typescript
// Wrapper: removed role, aria-expanded, aria-haspopup, aria-owns
<div className="searchable-multiselect" ref={wrapperRef}>

// Input: added role="combobox" and associated ARIA
<input
  role="combobox"
  aria-expanded={open}
  aria-haspopup="listbox"
  aria-controls={listboxId}
  aria-activedescendant={activeDescendant}
  // removed: role="searchbox"
/>
```

---

## Issue 5: Unused Imports (LOW)

**File:** `components/form/sections/LogisticsSection.tsx`

Removed unused `useFormContext` and `ItemizationFormData` imports left from earlier refactoring.

---

## Prevention Strategies

### Formula Injection

- **Always validate server action parameters against allowlists** — never accept dynamic table/field names from clients
- **Sanitize all user input** before interpolating into formulas — strip `"`, `\`, `\n`, `\r`
- **Code review checklist:** No string interpolation in Airtable filter formulas without allowlist validation

### Unauthenticated Routes

- **Default to locked-down** — any route with write operations or admin functionality must have explicit auth
- **Environment guards as minimum** — `process.env.NODE_ENV !== "development"` for dev-only tools
- **Code review checklist:** All `/api/admin/*` routes and routes with `fs.writeFile` require auth checks before handler logic

### Stepped Form State Loss

- **Never use `return null` to hide form sections** — this destroys React state
- **Use `hidden` + `inert` attributes** to hide sections while preserving component tree
- **Pattern:** `<div hidden={!isActive} inert={!isActive ? true : undefined}>`
- **Code review checklist:** Multi-step forms use CSS visibility, not conditional rendering

### ARIA Role Placement

- **ARIA roles belong on interactive elements** — `role="combobox"` on `<input>`, not wrapper `<div>`
- **Reference WAI-ARIA 1.2 spec** for combobox, listbox, and option patterns
- **Automated check:** Use `jest-axe` or `axe-core` to catch role misplacement in tests
