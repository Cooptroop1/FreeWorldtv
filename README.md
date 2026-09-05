# FreeStream World

Legal streaming discovery site: https://freestreamworld.com

Links out to official free and subscription providers (Tubi, Pluto TV, BBC iPlayer, ITVX, and others). This app does **not** host or embed video.

## Stack

Next.js 16 · Clerk · Vercel KV · Watchmode · TMDB

## Environment variables (Vercel)

- `WATCHMODE_API_KEY` — server only, never `NEXT_PUBLIC_`
- `REFRESH_SECRET` — protects refresh/cron routes
- `CRON_SECRET` — set this to the same value as `REFRESH_SECRET` so Vercel Cron can run
- `KV_REST_API_URL` / `KV_REST_API_TOKEN`
- Clerk keys (`CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`)
- `NEXT_PUBLIC_TMDB_READ_TOKEN` — used in the browser to enrich posters

## Admin

Pass `?secret=REFRESH_SECRET` or `Authorization: Bearer REFRESH_SECRET`:

- `GET /api/refresh-all-free?mode=full&region=GB` — full GB rebuild (use this once after deploy)
- `GET /api/cron/refresh` — daily GB+US merge, or full rebuild if a catalog is empty
- `GET /api/cron/title-map` — ingest Watchmode ID map into KV

Catalog keys: `free_catalog:{region}` and `premium_catalog:{region}`.

Visitor traffic never calls Watchmode for catalogs. Title source lookups are cached 30 days.
