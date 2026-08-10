# Noun-level house-bleed cluster rule, 2026-08-09

Owner ruling:

> A promotion can be ONE example... A cluster is the warning sign.

The deterministic gate previously failed when it found two distinct associated-house nouns anywhere in a complete card. That treated legitimate examples as equivalent to an interpretation defined by the associated house.

The gate now requires a cluster of four distinct governed domain nouns. This matches the canonical Sagittarius example (`teacher + education + publication + institution`) and the Capricorn example in the master prompt (`boss + career + promotion + title + public status + professional hierarchy`). One domain example does not fail the card.

Verification:

- `gold-lilith-capricorn-v5`: deterministic PASS.
- `neg-capricorn-career`: deterministic REVISE with `sign_house_separation`.
- All twelve gold fixtures: deterministic PASS.
- All eight negative fixtures: expected failure decision and categories unchanged.
- Gold and negative fixture files: byte-identical and untouched.
- Candidate writer: unpromoted.
