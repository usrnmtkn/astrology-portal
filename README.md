# Astrology Portal

A starter astrology website and member portal.

## Current scope

- Guest daily current-sky dashboard by location
- Logged-in account mode with daily, weekly, and monthly horoscope views
- Mock ephemeris adapter that can be replaced with a licensed provider
- Mock writing adapter that can be replaced with the supplied house style

## Run locally

```bash
npm install
npm run dev
```

## Integration points

- Ephemeris provider: `src/services/ephemeris.ts`
- Horoscope generation and writing style: `src/services/horoscopes.ts`
- Account/session behavior: `src/services/session.ts`

The first build uses deterministic sample data so the product can be designed and tested before the licensed ephemeris and final writing style are added.
