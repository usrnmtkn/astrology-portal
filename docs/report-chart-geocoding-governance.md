# Report chart geocoding governance

Status: owner-ruled
Ruling date: 2026-08-14

## Rule

A customer's stated birth city resolves to the municipal centroid. A named borough resolves to the borough centroid. The chart stores the resolved latitude and longitude together with the provider, provider feature ID, and resolution class. These fields are canonical calculation inputs and are covered by the natal-chart provenance hash and, transitively, by the frozen report-facts hash.

Cached Ascendant or Midheaven longitudes are not calculation inputs. A report always recomputes angles from the canonical birth input. A cached result may be reused only as a complete result whose provenance hash matches the canonical path.

## Marie Satori benchmark

- Civil input: 1979-02-18, 11:20 AM, America/New_York (16:20 UTC; EST, UTC-05:00).
- Place input: Manhattan borough centroid, `40.7831, -73.9712`.
- Settings: tropical zodiac, whole-sign houses, standard aspect profile.
- Engine: pinned `pyswisseph`/Swiss Ephemeris with Swiss data and no Moshier fallback.
- Natural angles: Ascendant `71.142526°` (11°09′ Gemini); Midheaven `316.608141°` (16°36′ Aquarius).
- Natural Saturn-sextile-Ascendant passes: 2026-05-19 direct, 2026-10-06 retrograde, 2027-02-10 direct.

The former `71.15° / 316.6°` request override was not provenance-backed and is removed. The earlier Production result near 11°03′ Gemini used the stored `40.7128, -74.0060` New York City coordinate, not the governed Manhattan borough centroid.

## Existing-chart audit and recomputation rule

Before this ruling, both social-profile charts and `manual_charts` stored the display label, coordinates, and timezone, but did not store the geocoder provider feature ID or centroid resolution. The UI's forward city search used Mapbox `place`/`locality` results, so many coordinates are likely centroids, but their source cannot be proven after the fact. They are classified `legacy_unprovenanced`; no source is inferred from the numbers.

- Existing frozen reports remain immutable review evidence and are not rewritten.
- Existing charts with `legacy_unprovenanced` coordinates require place reconfirmation and natal recomputation before a new canonical facts bundle is frozen.
- New Mapbox selections store `mapbox`, the returned feature ID, and `municipal_centroid` or `borough_centroid`.
- The migration marks existing manual-chart rows explicitly as `legacy_unprovenanced`. Existing social-profile JSON is classified the same way at read time until the customer reconfirms it.
