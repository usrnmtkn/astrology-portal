# Natal aspect orb-boundary repair — 2026-08-20

## Reported regression

Marie Satori's Moon in Scorpio placement page retained the tight Moon–Saturn,
Moon–Venus, and Moon–North Node contacts but omitted her wider Moon–Jupiter,
Moon–Mars, and Moon–Uranus natal contacts. The same calculation boundary feeds
the You and Friend natal lists, placement details, and chart wheels.

## Root cause

The 2026-08-12 natal fact-boundary repair correctly stopped trusting incoming
aspect records, which may contain stale, sky, transit, or cross-surface data.
It then recomputed natal geometry with `calculateSkyAspects`. That calculator
has a uniform five-degree major-aspect limit for current-sky work. Reusing it
on natal surfaces silently removed valid natal contacts outside five degrees.

The repository's established natal profile is wider and aspect-specific:

- conjunction and opposition: 8 degrees;
- square and trine: 7 degrees;
- sextile: 5 degrees;
- Sun or Moon contact: add 2 degrees; and
- quincunx: 3 degrees with no luminary expansion.

## Repair

The shared aspect engine now exposes `calculateNatalAspects` separately from
`calculateSkyAspects`. The sky/transit definitions are byte-for-byte unchanged.
The natal-only function applies the established natal profile and accepts fixed
Ascendant and Midheaven longitudes while excluding angle-to-angle noise.

`canonicalNatalAspectsForSnapshot` continues to ignore every incoming aspect
record. It now sends only fixed natal planet, point, and angle longitudes to the
natal calculator. This preserves the transit-leakage repair while restoring the
contacts lost through the five-degree sky limit.

## Surface coverage

The one boundary feeds:

- You natal aspect lists;
- You natal placement detail aspect lists;
- You natal wheels;
- Friend natal aspect lists and grouping;
- Friend natal placement detail aspect lists; and
- Friend natal wheels.

## Regression gates

`scripts/test-natal-aspect-fact-boundary.mjs` now proves:

1. Marie's Moon regression retains Saturn sextile, Venus sextile, North Node
   sextile, Mars square, Jupiter square, and Uranus conjunction;
2. the wider Moon contacts remain absent from the current-sky calculator;
3. exact natal orb boundaries are inclusive and over-limit contacts fail
   closed;
4. quincunx does not inherit the luminary expansion;
5. Ascendant and Midheaven contacts are derived from fixed angle longitudes,
   without angle-to-angle rows;
6. injected sky and transit records remain unable to enter natal surfaces;
7. two dates match independently assembled direct Swiss Ephemeris matrices;
   and
8. every You and Friend consumer remains wired to the shared natal boundary.

No reader copy, approval metadata, serving-content row, auto-publish setting,
or writer-promotion state changed.
