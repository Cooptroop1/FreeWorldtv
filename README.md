# FreeStream World

Legal streaming discovery site: https://freestreamworld.com

Links out to official free and subscription providers (Tubi, Pluto TV, BBC iPlayer, ITVX, and others). This app does **not** host or embed video.

## Stack

Next.js 16 · Clerk · Vercel KV · Watchmode · TMDB · AdSense (consent-gated)

## Environment variables (Vercel)

- `WATCHMODE_API_KEY` — server only, never `NEXT_PUBLIC_`
- `REFRESH_SECRET` — protects refresh/debug/cron routes
- `CRON_SECRET` — set automatically by Vercel Cron
- `KV_REST_API_URL` / `KV_REST_API_TOKEN`
- Clerk keys (`CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`)
- `NEXT_PUBLIC_TMDB_READ_TOKEN` — used in the browser to enrich posters

## Admin

Pass `?secret=REFRESH_SECRET` or `Authorization: Bearer REFRESH_SECRET`:

- `GET /api/refresh-all-free?mode=full&region=GB`
- `GET /api/debug-snapshot`
- `GET /api/cron/refresh` (also hit monthly by Vercel Cron)

Catalog keys: `free_catalog:{region}` and `premium_catalog:{region}`.
