# Moon sky-placement authored overrides

Status: queued as a replacement batch for authoring and owner review.

The generic Moon fallback is intentionally safe and reusable. Sign-specific
writing belongs in the existing authored override slots, not in new fallback
token families.

The current package already has an approved first pass in these slots. Draft a
replacement set outside the live row collection, then replace all three rows
for a sign together after owner approval:

- `fallback-hook/sky-placement-hook/moon/{sign}`
- `fallback-hook/sky-placement-lived/moon/{sign}`
- `fallback-hook/sky-placement-turn/moon/{sign}`

Signs:

- Aries
- Taurus
- Gemini
- Cancer
- Leo
- Virgo
- Libra
- Scorpio
- Sagittarius
- Capricorn
- Aquarius
- Pisces

Each replacement starts with `review_status: needs_review`. Promote and import
a complete three-row sign set only after owner review. Never mix one revised
slot with two slots from the previous authored version.

Do not add combination-level fallback tokens such as `lived_behavior`,
`social_signal`, or `shadow_response`. A missing authored atom is omitted or
served by the generic fallback; it is never synthesized.
