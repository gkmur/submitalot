# Submission Efficiency: Carry-Forward, History, and Templates

**Date:** 2026-02-12
**Status:** Ready for planning

## What We're Building

Repeat submitters (known group) fill out ~40 fields but typically only change 1-5 between submissions. Currently every submission resets to blank. We're adding three features to eliminate that friction:

1. **Smart "Submit Another"** — after submission, a section-level checklist lets the user choose which sections to keep vs. clear. Form stays filled with their selections.
2. **Auto-saved submission history** — every successful submission is automatically saved to localStorage (last 10-20 entries). Accessible from within the form for quick cloning.
3. **Named templates** — save current form state as a named template. Load any saved template to prefill the form.

## Why This Approach

- **All localStorage, no backend changes** — zero new API calls, no auth, no database tables. Keeps complexity low and ships fast.
- **Browser-local is fine** — users are a known group on consistent machines. Portability across devices isn't a requirement.
- **Section-level granularity** — the form already has 7 sections. Asking "keep this section?" maps cleanly to how users think about their submissions (keep the seller setup, change the pricing).

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Identity | None needed | Everything is browser-local, no cross-device requirement |
| Storage | localStorage only | Simplest path, no backend changes, known users on consistent machines |
| Carry-forward granularity | Section-level checklist | Maps to existing 7-section form structure, not too granular, not too coarse |
| History depth | Last 10-20 submissions | Enough to cover recent work without bloating storage |
| Templates | Named, user-created | Separate from history — templates are intentional presets, history is automatic |
| UI location | Within the form experience | No separate dashboard or pages. Panel/dropdown in stepper sidebar or form header. |

## Feature Details

### Smart "Submit Another"
- After successful submission, show a checklist of all 7 sections
- Each section shows a summary (key field values) and a keep/clear toggle
- Default: keep everything (since most submissions only change 1-5 fields)
- Clearing a section resets those fields to form defaults
- File uploads always clear (can't resubmit the same file reference)

### Auto-saved History
- On successful submission, snapshot the form data to localStorage
- Store as JSON array, newest first, capped at ~20 entries
- Each entry: timestamp, key identifying fields (seller, brand partner, inventory type), full form data
- UI: list in sidebar or dropdown showing recent submissions with summary labels
- "Clone" action loads the full form data, user tweaks what they need

### Named Templates
- "Save as Template" button available from the form
- Prompts for a name (e.g., "Standard wholesale - Nike")
- Stores the current form state (minus file uploads) under that name in localStorage
- UI: template picker alongside history, with load and delete actions
- Templates are separate from history — they persist until manually deleted

## Open Questions

- Should the keep/clear checklist default to "keep all" or "keep none"? (Leaning keep all given 1-5 field changes)
- How to handle linked record fields in templates? (Seller, brand partner are Airtable record IDs — need to store enough info to repopulate the picker)
- localStorage size limits (~5-10MB) — should we warn if approaching the cap?
- Should templates store the display labels for select/multi-select fields, or just the values?

## Scope Boundary

**In scope:**
- Smart carry-forward on resubmit
- localStorage-based submission history
- localStorage-based named templates
- UI within the existing form experience

**Out of scope (for now):**
- User accounts or authentication
- Server-side storage of history/templates
- Cross-device sync
- Submission history from Airtable (querying past records)
- Separate dashboard pages
