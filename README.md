# Holding My Breath Until Mac Arrives

A small joke project that turns waiting for a MacBook delivery into a live countdown landing page.

The app shows:

- a real-time countdown in days, hours, minutes, and seconds
- a localized interface in English or Korean
- the target delivery date interpreted in `Asia/Seoul`
- a summary of the ordered machine configuration and total price
- a live shipment section for Apple order status and DHL tracking

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- Biome for formatting and linting

## Features

### Live countdown states

The countdown has three states:

- `countdown`: before the delivery date starts
- `imminent`: during the delivery date itself
- `arrived`: after the delivery date window has passed

The countdown logic lives in `src/lib/countdown.ts`.

### Locale detection

The page defaults to English or Korean based on request headers:

- `x-vercel-ip-country`
- `accept-language`

Korean is selected when the country is `KR` or the language header contains `ko`. Otherwise the app falls back to English.

The detection logic lives in `src/lib/i18n.ts`.

### Manual language toggle

Even though the initial locale is chosen from headers, the UI also exposes an `ENG / KOR` toggle so the viewer can switch languages manually on the page.

### Shipment tracking

The countdown card includes a server-fetched shipment summary for:

- Apple order status
- DHL tracking

Tracking data is normalized in `src/lib/tracking.ts` and cached for 5 minutes.

Behavior:

- if a provider fetch succeeds, the latest snapshot is cached
- if a later fetch fails, the page reuses the last successful provider snapshot and marks it as stale
- if no cached value exists, that provider falls back to an unavailable state
- Redis/KV cache is used when configured (`KV_REST_API_URL` + `KV_REST_API_TOKEN` or Upstash equivalents)
- if Redis/KV is not available, the app falls back to best-effort in-memory cache

Current limitations:

- Apple requires an authenticated guest-order cookie. Anonymous server requests currently return `403 Forbidden`.
- DHL now uses the official Shipment Tracking API and requires a valid `DHL_API_KEY`.

## Project structure

```text
src/
  app/
    layout.tsx        Root layout and global metadata
    page.tsx          Server entry that detects locale from headers
    globals.css       Tailwind import only
  components/
    home-page.tsx     Compatibility export for the home feature
  features/
    home/
      home-page.tsx   Main landing page UI and localized content
    tracking/
      service.ts      Apple + DHL tracking fetch, normalization, and cache
  lib/
    countdown.ts      Countdown math and delivery state calculation
    i18n.ts           Locale detection helpers
    tracking.ts       Tracking service re-export for app-level imports
```

## Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run format
```

## Configuration

### Change the delivery target

Edit the `deliveryTarget` constant in `src/components/home-page.tsx`.

Current values:

- date: `2026-03-25`
- timezone: `Asia/Seoul`
- UTC offset: `+09:00`

### Change the order specs or price

Edit these values in `src/components/home-page.tsx`:

- `orderPrice`
- `copyByLocale.en.*.specs`
- `copyByLocale.ko.*.specs`

### Change localized copy

All display copy is currently stored directly in `src/components/home-page.tsx` inside `copyByLocale`.

That includes:

- eyebrow text
- title
- specs section title
- total label
- countdown unit labels
- timezone note
- shipment labels

### Configure tracking

The tracking layer reads these environment variables:

- `APPLE_ORDER_URL`
  Default: the hardcoded Apple guest order URL currently used by the page
- `APPLE_ORDER_COOKIE`
  Required for Apple tracking to work on the server
- `APPLE_ORDER_USER_AGENT`
  Optional override for the Apple request user agent
- `DHL_TRACKING_URL`
  Default: `https://api-eu.dhl.com/track/shipments`
- `DHL_TRACKING_NUMBER`
  Default: `7197708221`
- `DHL_TRACKING_PAGE_URL`
  Optional public DHL tracking page used as the source link in the UI
- `DHL_API_KEY`
  Required for DHL tracking via the official Shipment Tracking API
- `DHL_TRACKING_LANGUAGE`
  Optional API response language, defaults to `ko`
- `DHL_UTAPI_COOKIE`
  Optional browser cookie string for the public DHL web fallback endpoint when the official API is unavailable
- `KV_REST_API_URL` / `KV_REST_API_TOKEN`
  Preferred cache backend (Vercel KV REST)
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
  Alternative Redis REST envs (supported as fallback names)
- `TRACKING_CACHE_KEY`
  Optional key name for the cached tracking snapshot (default: `tracking:snapshot:v1`)

Example:

```bash
APPLE_ORDER_COOKIE='session-cookie-here'
APPLE_ORDER_URL='https://secure9.store.apple.com/...'
DHL_TRACKING_URL='https://api-eu.dhl.com/track/shipments'
DHL_TRACKING_PAGE_URL='https://www.dhl.com/kr-ko/home/tracking.html?submit=1&tracking-id=7197708221'
DHL_TRACKING_NUMBER='7197708221'
DHL_API_KEY='your-dhl-subscription-key'
DHL_TRACKING_LANGUAGE='ko'
DHL_UTAPI_COOKIE='ak_bmsc=...; _abck=...; bm_sz=...'
KV_REST_API_URL='https://...upstash.io'
KV_REST_API_TOKEN='...'
TRACKING_CACHE_KEY='tracking:snapshot:v1'
```

Notes:

- `APPLE_ORDER_COOKIE` is intentionally not committed and must be supplied manually.
- `DHL_API_KEY` must be issued from the DHL Developer Portal for the `Shipment Tracking - Unified` API.
- `DHL_UTAPI_COOKIE` is only a best-effort fallback for DHL's protected public web endpoint and may expire quickly or stop working without warning.
- Redis/KV is the primary cache backend when configured.
- In-memory cache is process-local and can reset across cold starts or instance changes.

## Verification

This project uses Biome for checks:

```bash
npm run lint
```

To verify production compilation:

```bash
npm run build
```

## Notes

- The page is server-rendered on demand because locale detection depends on request headers.
- The UI is implemented with Tailwind utility classes only.
- Pretendard is loaded globally from CDN in the root layout.
- Shipment tracking is fetched server-side and rendered as a snapshot while the countdown itself continues ticking client-side.
