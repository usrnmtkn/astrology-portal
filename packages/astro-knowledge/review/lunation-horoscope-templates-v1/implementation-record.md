# Lunation horoscope templates V1 implementation record

Date: 2026-08-11

## Scope

This change encodes the attached calibration package as a non-serving contract and adds a
fact-gated packet compiler for four event types:

- New Moon
- Full Moon
- Solar eclipse
- Lunar eclipse

No reader copy, fallback row, renderer, approval status, package version, or generated
runtime artifact changes in this implementation.

## 2026-08-23 matching New Moon anchor update

The owner added a required six-month callback for every ordinary Full Moon write-up. The
compiler now requires the matching New Moon's exact time and sign, verifies that it precedes
the Full Moon and shares its sign, and supplies the governed anchor sentence. The formatter
includes the New Moon year only when its calendar year differs from the Full Moon year.

The initial rule update was non-serving. The owner subsequently clarified that the app
assembly itself was the target and authorized implementation. The reader package now carries
an approved anchor hook, both parallel resolvers require the verified engine fact, weekly
assembly supplies it, and the You-page fallback supplies it when that existing fallback is
enabled. The package artifacts and package version are rebuilt with the runtime change.

## Governance

The owner package says `NOTHING SHIPS`. The owner resolved and confirmed all three template
questions on 2026-08-11. The machine contract records calibration as resolved while keeping
generation and serving separately gated:

- `runtimeEligible: false`
- `generationAuthorized: false`
- `servingAuthorized: false`

The three owner questions remain machine-readable resolved decisions with their rulings and
dates. The compiler can assemble a calibration packet for inspection, but `--for-generation`
continues to fail closed until generation receives separate authorization.

## Fact boundary

The compiler requires an exact zoned date-time, degree, event sign, rising sign, whole-sign
house and concrete house domains, traditional ruler placement, a complete aspect inventory,
and a complete outer-planet inventory. Full Moons and lunar eclipses also require the
opposing Sun sign and house. Empty aspect or outer-planet sets are accepted only when the
engine explicitly marks the set complete.

Each aspect is preserved as a separate attribution record. The packet contains facts and
writing instructions only; it contains no generated horoscope prose.

## Owner decisions

1. Resolved 2026-08-11: ordinary New Moons mention the lunar arc.
2. Resolved 2026-08-11: Full Moon closes match the theme of the Full Moon.
3. Resolved 2026-08-11: a solar-eclipse horoscope describes what the event itself is. The
   desire test is not part of the solar-eclipse template.
