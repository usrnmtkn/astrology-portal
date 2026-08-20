# Natal aspect complete-display repair — 2026-08-20

## Owner directive

The owner directed that natal placement pages must not hide valid aspects,
that the four-aspect cap be removed, that the same rule apply to You and
Friends, and that the remaining natal chart surfaces be checked for equivalent
errors.

## Root causes

The natal placement detail UI was introduced in commit `5098a55e` with a
presentation-only limit:

```text
Sky placement detail: 2 related aspects
Natal placement detail: 4 related aspects
```

The commit contains no astrology rule, product contract, or explanatory
comment for the natal limit. It was a compact-layout choice in the first
related-aspect implementation. Later resolver and content-safety work retained
the cap, so correct canonical natal facts were discarded only after
calculation.

The main You natal aspect list had a second, independent eight-row cap. Friend
natal overview grouping and both chart wheels already consumed the full
canonical inventory. Friend placement details nevertheless inherited the
four-row cap because You and Friend use the same natal placement article
builder.

The prior Marie regression fixture did not use Marie's actual birth-chart
longitudes. It approximated the missing Mars, Jupiter, and Uranus contacts
inside the then-current orb limits, so it proved the calculator wiring without
proving the reported chart.

## Verified Marie Moon geometry

Direct Swiss Ephemeris calculation for the repository's saved Marie Satori
birth fixture (1979-02-18, 11:20 America/New_York, Manhattan, tropical zodiac)
produces these relevant Moon contacts:

| Contact | Orb | Result after repair |
|---|---:|---|
| Moon sextile Saturn | 1.4° | planetary group |
| Moon sextile Venus | 2.2° | planetary group |
| Moon square Midheaven | 3.8° | angles and points group |
| Moon sextile North Node | 4.8° | angles and points group |
| Moon trine Mercury | 5.7° | planetary group |
| Moon sextile Lilith | 6.9° | angles and points group |
| Moon opposition Chiron | 7.2° | angles and points group |
| Moon conjunct Uranus | 8.2° | planetary group |
| Moon square Mars | 10.0° | planetary group |
| Moon square Jupiter | 11.8° | planetary group |

The Ascendant quincunx is a calculated fact but remains intentionally excluded
by the existing reader display contract, which does not serve quincunxes.

## Repair

1. Natal placement details no longer apply a row cap.
2. The main You natal aspect list no longer applies its eight-row cap.
3. Placement details divide the complete list into `Planetary aspects` and
   `Angles and points`, so an angle, node, Lilith, or Chiron contact cannot
   displace a planetary contact.
4. Natal Sun/Moon squares now use a twelve-degree maximum. Other natal aspect
   limits remain unchanged, and the current-sky/transit matrix remains
   unchanged.
5. The Marie regression now uses the actual verified birth-chart longitudes
   and checks the complete canonical Moon inventory.

## Surface audit

| Surface | Before | After |
|---|---|---|
| You natal placement detail | four closest rows | complete canonical display inventory, grouped by counterpart |
| Friend natal placement detail | four closest rows through shared builder | complete canonical display inventory, grouped by counterpart |
| You natal overview | eight closest rows | complete canonical display inventory |
| Friend natal overview | already complete | unchanged, guarded |
| You natal wheel | already complete | unchanged, guarded |
| Friend natal wheel | already complete | unchanged, guarded |
| Natal aspect detail | exact selected fact | unchanged |
| Sky placement detail | separate two-row current-sky policy | unchanged; outside this natal repair |

No reader copy, review status, approval metadata, auto-publish setting, or
writer-promotion state changed.
