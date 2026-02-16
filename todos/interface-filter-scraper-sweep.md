# Interface + Filtering + Listing + Scraper Sweep

## Scope detected in this repository
- Present: Itemization form UI, admin field-mapping UI, Airtable integration routes.
- Missing: Feed page, listing cards, listing search/filter stack, scrapers, hunts, notifications.

## Task walk-through status

### 1) Interface/page audit
- Status: Partial (completed for pages that exist).
- Pages found:
  - `/` (itemization form)
  - `/admin` (schema/mapping admin)
- TODO(blocked): No feed/listing/search pages exist in this repository, so those UI audits cannot be executed here.

### 2) Filtering bugs
- Status: Partial.
- Verified existing filter surface:
  - Admin field filter input in `app/admin/AdminPanel.tsx`.
- TODO(blocked): No multi-filter stack for size/price/brand exists in this repository.

### 3) Listing cards
- Status: Blocked.
- TODO(blocked): No listing card components/routes found in this repository.

### 4) Scraper A
- Status: Blocked.
- TODO(blocked): No scraper code, parser fixtures, or scraping pipelines found in this repository.

### 5) Scraper B
- Status: Blocked.
- TODO(blocked): No scraper code, parser fixtures, or scraping pipelines found in this repository.

### 6) Quality checks run
- `npm run build`: pass
- `node --test lib/conditional-logic.test.mjs`: pass (6/6)
- `npm run lint`: TODO(blocked) - lint script does not exist in `package.json`

## Notes
- This repository appears to be an inventory submission app, not the feed/listing/scraper project.
- Use the correct repo/workspace to execute the full task list end-to-end.
