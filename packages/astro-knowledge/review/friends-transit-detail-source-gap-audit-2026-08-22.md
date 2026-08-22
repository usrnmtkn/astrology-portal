# Friends transit detail source-gap audit - 2026-08-22

Status: repair queue evidence. No copy, approval, serving-content, auto-publish, or writer-promotion change.

## Reader incident

The Friends Transits tab rendered a usable preview and then exposed the internal sentence `Full interpretation unavailable pending source verification.` when its provenance gate found no eligible full detail section. The card was disabled, but the implementation still made an internal editorial state part of the reader experience.

The reader UI now omits personal-transit and house-transit cards whose normalized article has zero provenance-eligible detail sections. The existing detail gate remains unchanged and still refuses heading-only articles.

## Screenshot traces

### Uranus through Jose's 4th house

- Existing approved reader article: `authored/transit-house/uranus/4`.
- Approval level: `owner_signoff_untraced`.
- Source: `TLDR-House-Transits-Library.md`.
- The row has only reader-directed `body`; it has no authored Friend `body_they`.
- `renderTransitHouse` deliberately uses this legacy article only for `voice="you"`. Friends therefore fall through to the generic house template.
- The generic preview is assembled from `fallback-hook/transit-effect-house/uranus` and `fallback-vocab/house-topic/4`. Those rows do not carry a Friends-accepted structured approval level, so the detail gate correctly rejects the assembled section.

Conclusion: complete approved content exists, but it is not safe to route to Friends until a separately reviewed Friend passage exists. Do not globally inflect the reader article.

### Moon through Jose's 10th house

- No `authored/transit-house/moon/10` article exists.
- No layered Moon `authored/transit-house-intro/moon/10` plus `authored/transit-house-sign/moon/10/{sign}` family exists.
- The visible preview is a generic composition from `fallback-hook/transit-effect-house/moon` and `fallback-vocab/house-topic/10`.
- Those contributing rows do not carry a Friends-accepted structured approval level, so the detail gate correctly rejects the assembled section.

Conclusion: this is a genuine authored-content gap, not missed routing.

## Canonical inventory

- 84 `authored/transit-house-intro` rows and 1,008 `authored/transit-house-sign` rows exist. They provide complete dual-voice coverage for Sun, Mercury, Venus, Mars, Jupiter, and Saturn; the Mars counts include its second variant.
- 108 legacy `authored/transit-house/{planet}/{house}` rows exist. All 108 are `owner_signoff_untraced`, and zero have `body_they`.
- The 108 legacy rows cover Jupiter, Saturn, Uranus, Neptune, Pluto, Chiron, North Node, South Node, and Lilith, twelve houses each.
- Jupiter and Saturn already have the newer dual-voice layered path. The remaining 84 legacy articles (Uranus, Neptune, Pluto, Chiron, North Node, South Node, and Lilith) are approved You copy without a separately authored Friend passage.
- Moon has neither a legacy full article nor the newer dual-voice layered family.

## Repair queue

1. Keep the reader omission in place for every zero-detail personal or house transit.
2. Author and review the missing Moon Friend transit-house family from the computed planet, sign, and house mechanisms.
3. Prepare separately authored Friend passages for the 84 outer-planet/point legacy house articles. Do not derive them by pronoun substitution from the You passages.
4. Audit personal-transit combinations separately. Any normalized personal transit with zero eligible detail sections remains hidden and must be reported by its computed aspect key.
5. When a gap is filled, the existing provenance gate must turn `detailAvailable` on automatically; no UI exception or placeholder is permitted.

## Regression contract

- Internal review, provenance, approval, or source-verification language never renders to readers.
- A visible Friends transit card always has at least one eligible full detail section and opens a non-empty article.
- Missing coverage stays fail-closed and is repaired in the content layer, never with React-authored interpretation.
