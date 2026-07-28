# Astrology Date Guardrails

TLDR Astro keeps astronomical instants and reader-facing calendar dates separate:

- Swiss Ephemeris calculations return exact UTC timestamps.
- The web and Python calculation paths both use the True Node.
- Readers see the civil date in the selected chart location's IANA timezone.
- Lunar-node motion remains an internal fact and is not presented as a planetary retrograde.
- Invalid, reversed, or unrecognized date inputs fail instead of rendering a plausible-looking range.

## Authoritative fixtures

Curated fixtures live in `scripts/fixtures/astrology-date-guardrails.json`. Each event must cite a source and include:

- a UTC calculation date or timestamp;
- expected signs or motion;
- expected civil-date ranges in UTC and representative world timezones;
- a future review deadline and coverage horizon.

The initial sources are CHANI for the 2025–2028 True Node sign windows and Astrodienst for Pluto stations through 2028.

In addition to the curated source checks, the suite samples every month from 2026 through 2028. Every calculated sign-transit window must contain its sample instant, and every visible planetary retrograde must have a chronological station window that contains that instant.

## Required release check

Run:

```sh
node scripts/test-astrology-date-guardrails.mjs
```

The test is part of `npm run test:content`, so normal CI and the root `npm test` command enforce it. It fails when:

- either calculator switches away from the True Node;
- calculation provenance is stale;
- a node sign or ingress date changes;
- a published station timestamp moves outside its tolerance;
- UTC is used as a reader-facing timezone when a chart location exists;
- a date crosses midnight incorrectly in a supported timezone;
- a fixture lacks a source;
- the scheduled source-review deadline passes.

Before the `reviewBy` date, extend the fixture with the next authoritative node windows and representative planetary station cycles, update `coverageEndsAt`, and move `reviewBy` forward.
