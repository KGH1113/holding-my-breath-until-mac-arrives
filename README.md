# Holding My Breath Until Mac Arrives

A small joke project that turns waiting for a MacBook delivery into a live countdown landing page.

The app shows:

- a real-time countdown in days, hours, minutes, and seconds
- a localized interface in English or Korean
- the target delivery date interpreted in `Asia/Seoul`
- a summary of the ordered machine configuration and total price

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

## Project structure

```text
src/
  app/
    layout.tsx        Root layout and global metadata
    page.tsx          Server entry that detects locale from headers
    globals.css       Tailwind import only
  components/
    home-page.tsx     Main landing page UI and localized content
  lib/
    countdown.ts      Countdown math and delivery state calculation
    i18n.ts           Locale detection helpers
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
