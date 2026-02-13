# Form UX Overhaul Brainstorm

**Date:** 2026-02-12
**Status:** Ready for planning

## What We're Building

A significant UX overhaul of the submitalot itemization form, touching five areas:

### 1. Section-by-Section Flow (TypeForm-inspired)

Move from a single long scrolling form to a **section-at-a-time** layout. Each of the 7 active sections (qualification removed) gets the full focus area. Key requirements:

- **Progress indicator** — sidebar or top bar showing all sections, current position, completion state (with error/incomplete indicators per section)
- **Section navigation** — click to jump to any section freely (permissive, not gated)
- **Validation strategy** — permissive navigation. Jump anywhere, show error/incomplete indicators on the section nav, validate everything on final submit only
- **Smooth transitions** — animated slide/fade between sections
- **Grouped, not atomized** — sections stay grouped as they are now (not one-question-per-page)

### 2. Selector/Multi-Select Overhaul

**Hybrid search + popular pins** for large option lists:
- Show top 5-6 most common picks as visible quick-select pills
- "Search all..." input below for the long tail (200+ countries, etc.)
- Selected items appear as dismissible tags
- Applies to: Restrictions (Region), Restrictions (Buyer Type), and any multi-select with 10+ options

**Pill styling improvements** for radio groups and scales:
- Visually balanced sizing — consistent padding, alignment, even distribution
- Research form UX best practices during plan phase for specific patterns
- Scales (1-5) should feel like a cohesive unit, not loose pills

**Smaller multi-selects** (Category Groups, Tag Presets with <10 options):
- Keep as visual selectors but improve styling to match new design language

### 3. Linked Record Pickers — Rich Preview

**Rich preview cards** replacing the plain text dropdown:
- Show 3-4 fields from the linked record on hover or inline
- **Sellers**: sorted by most recent first, show company/status metadata
- **Brand Partners**: sorted alphabetically, show relevant context
- **Restrictions (Company)**: multi-select mode, show company details

This means the search endpoint needs to return more fields per record, and the linked-records config needs to specify which fields to display.

### 4. Animations — Tasteful Transitions

Polished but restrained motion design:
- **Section transitions**: slide/fade between sections in the new flow
- **Field reveals**: smooth entrance for conditional fields (improve existing `fadeSlideIn`)
- **Hover micro-interactions**: subtle scale/color on pills, cards, buttons
- **Progress bar animation**: smooth fill as sections complete
- **Selected state**: satisfying feedback when picking an option (not just color swap)
- **Loading states**: skeleton/shimmer for linked record searches

NOT doing: spring physics, parallax, staggered entrances, heavy choreography.

### 5. Airtable Dev Admin Panel

A `/admin` route for managing the Airtable integration:
- **Field browser**: list all fields from the Airtable base with types, options, select choices
- **Mapping view**: show which Airtable fields are mapped to form fields, which aren't
- **Auto-generate mapping**: sync button that re-fetches the Airtable schema and writes/updates the `AIRTABLE_FIELD_MAP` in constants.ts (and optionally scaffolds new field entries in the schema/types)
- **Developer tool only** — no auth needed, just a dev convenience route

### 6. Remove Qualification Section

- Comment out the QualificationSection from the form render
- Keep the component file and all related code (schema, types, constants) intact
- Comment out validation for qualification fields in the Zod schema
- Easy to uncomment and restore later

## Why This Approach

- **Section-by-section flow** reduces cognitive load on a 59-field form. Progress nav prevents the "trapped in a wizard" feeling that strict linear flows create.
- **Hybrid selectors** solve the checkbox wall problem without hiding everything behind search (which is slower for common picks).
- **Rich linked records** make the form self-documenting — you can confirm you picked the right seller without leaving the form.
- **Tasteful animations** make the form feel intentional and fluid without becoming a distraction. The form is a work tool, not a marketing page.
- **Admin panel** reduces the friction of "I need to add a field" from code-diving to visual browsing.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Form flow | Section-at-a-time with jump nav | Focus without feeling trapped |
| Large multi-selects | Hybrid: pinned popular + search | Speed for common cases, power for edge cases |
| Single-choice pills | Keep but polish visually | Layout balance, consistent sizing |
| Linked records | Rich preview cards with sorting | More context, smarter ordering |
| Animations | Tasteful transitions | Fluid not flashy — it's a work tool |
| Section validation | Permissive nav, validate on submit | Fluid navigation, no frustrating gates |
| Airtable management | /admin with auto-generate mapping | Visual browsing + actually writes code on sync |
| Qualification section | Comment out (recoverable) | Quick, obvious, no abstraction needed |

## Open Questions

- **Which fields to show in linked record previews?** Need to check what's available in the Sellers/Admins/Companies tables. Will resolve during planning.
- **Popular pins for Region** — hardcode top picks (US, Canada, UK, etc.) or derive from usage data? Region already defaults to US. Buyer Type has only ~15 options — may not need search at all, just better visual treatment.
- **Animation library** — vanilla CSS transitions vs. Framer Motion? CSS keeps it light, Framer gives more control over section transitions and sequencing.
- **Auto-generate safety** — how does the admin panel write to constants.ts without breaking existing mappings? Needs a merge strategy, not a full overwrite.

## Scope & Constraints

- Keep the existing react-hook-form + Zod architecture
- Dark theme only (no light mode consideration)
- No auth on admin panel (dev tool)
- Qualification section removal is non-destructive (comment out)
- Form UX best practices research happens in plan phase
