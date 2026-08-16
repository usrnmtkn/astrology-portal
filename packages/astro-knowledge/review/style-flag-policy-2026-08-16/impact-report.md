# Style-flag policy impact report

Generated: 2026-08-16

This is a policy-only audit. Persisted row status changes: **0**. No copy, review status, approval, staging, promotion, or serving state changed.

## Currently serving reader copy

- Records scanned: 6834
- Rows with deterministic failure under the old flat list: 21
- Rows with deterministic failure under the classified policy: 2
- Rows with advisory-only findings: 2
- Findings by policy class: {"EDITORIAL_REVIEW":2,"HARD_BAN":2}
- Rows by policy class: {"EDITORIAL_REVIEW":2,"HARD_BAN":2}

## Owner corpus and evidence stores

- Records scanned: 7274
- Rows excluded under the old flat list: 47
- Rows excluded under the classified policy: 12
- Rows with advisory-only findings: 7
- Findings by policy class: {"AI_TELL_PREVENTIVE":3,"EDITORIAL_REVIEW":5,"HARD_BAN":9,"REPLACEMENT_SUGGESTION":2}
- Rows by policy class: {"AI_TELL_PREVENTIVE":3,"EDITORIAL_REVIEW":5,"HARD_BAN":9,"REPLACEMENT_SUGGESTION":2}

## Serving rows reclassified from the old deterministic failure

- `authored/compat-pair/mercury/gemini/gemini`: death -> no finding
- `authored/transit-house-intro/jupiter/9`: profound -> no finding
- `authored/transit-house-intro/mars/8`: death -> no finding
- `authored/transit-house-sign/mars/5/taurus`: death -> no finding
- `authored/transit-house/north-node/4`: die -> no finding
- `fallback-hook/placement-house-lived/neptune/8`: death -> no finding
- `fallback-hook/placement-house-lived/neptune/9`: death -> no finding
- `fallback-hook/placement-house-sentence/lilith/5`: die -> no finding
- `fallback-hook/placement-house-sentence/neptune/9`: death -> no finding
- `fallback-hook/placement-house-sentence/uranus/8`: death -> no finding
- `fallback-hook/planet-lived/neptune`: profound -> no finding
- `fallback-hook/sky-newmoon-sign/scorpio`: dying -> no finding
- `fallback-hook/sky-placement-lived/lilith/pisces`: self-erasure -> self-erasure (EDITORIAL_REVIEW, warn)
- `fallback-hook/sky-season-ritual/scorpio`: death -> no finding
- `fallback-hook/sky-season-shadow/libra`: self-erasure -> self-erasure (EDITORIAL_REVIEW, warn)
- `fallback-hook/transit-effect-hard/mercury/venus`: death -> no finding
- `fallback-hook/transit-effect-hard/pluto/north-node`: death -> no finding
- `fallback-hook/transit-effect-soft/saturn/neptune`: dying -> no finding
- `fallback-hook/transit-retro-article/pluto`: dying -> no finding
