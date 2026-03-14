# submitalot

Inventory submission portal backed by Airtable. Built for internal ops — form submissions create and update records across linked tables, with schema sync, rate limiting, and telemetry.

Live: [submitalot.vercel.app](https://submitalot.vercel.app)

## Stack

- Next.js 15 (App Router, Server Actions)
- TypeScript
- Airtable as the data layer
- Vercel for hosting

## Features

- **Linked record search** — typeahead search across Airtable tables with inflight deduplication and Redis-backed cache
- **Auto schema sync** — field definitions sync from Airtable schema on demand, no manual config
- **Rate limiting** — per-IP limits on linked record searches
- **Telemetry** — sampled event tracking on key actions (cache hits, errors, rate limits)
- **Admin view** — submission management interface

## Setup

```bash
npm install
cp .env.local.example .env.local  # fill in Airtable + Redis credentials
npm run dev
```

Required env vars: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `REDIS_URL` (or equivalent KV store).
