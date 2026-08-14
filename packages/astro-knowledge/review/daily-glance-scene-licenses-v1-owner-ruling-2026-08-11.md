# Daily Glance scene licenses v1 — owner ruling

Date: 2026-08-11
Status: `APPROVED_AS_REVISED`
Authority source ID: `owner-doctrine:daily-glance-scene-license-ruling-2026-08-11`

Per the review-sheet ruling form, these exact field-level changes constitute approval of the revised meanings.

## `scene-license/aspect/moon-conjunction-neptune/v1` — approved as revised

- actions: `notice another person's mood`; `form an explanation before the other person has explained what happened`
- behaviors: `absorb another person's mood as their own`; `imagine a version of the situation or person that may differ from what is actually happening`
- consequences: `confusion about which feelings belong to them`
- REMOVED: `fill uncertainty with an imagined explanation`; `an impression can feel more certain than the available facts`; `the reader acts on an assumption before clarification`
- Closed vocabulary: delete the synonym `a coworker seems uneasy` (role leak).

## `scene-license/house/6/v1` — approved as revised

- domains: `daily work`; `routines`; `health habits / body care`
- objects: `appointment`
- actions: `manage a schedule` — provenance flag `normalized`, not verbatim
- roles: none. `coworker` is removed from v1 and may return only in a future version citing an explicit owner-doctrine source ID, never this matrix passage.

## `scene-license/house/10/v1` — approved as revised

- domains: `career`; `reputation`; `public responsibility`; `professional achievement`
- roles: `manager / authority figure` — provenance flag `normalized, owner-reviewed`
- settings: `work that can be evaluated publicly or professionally`
- REMOVED: `client` (reserved for a future house-7 license); `make a professional decision` (house licenses the arena; planet/aspect licenses what the person does in it).

## `scene-license/transit-sign/moon-virgo/v1` — approved with one change

- action: `check details` (was `recheck details`)
- behavior unchanged: `responds by trying to make the feeling useful or correctable`

## Registry-wide invariants

1. Owner doctrine may support a normalization but must be cited as owner doctrine with its own source ID. Never cite a matrix passage for a grant the passage never made.
2. Aspect licenses mechanism; house licenses arena/roles/settings; sign licenses manner. Structurally: sign licenses cannot carry domains/roles/objects; house licenses cannot carry behavioral mechanisms.

The four licenses may be set to `ownerApproved: true, writerEligible: true` only after these exact fields are applied and provenance/compiler tests pass against the revised registry. A license remains `renderEligible: false`: it licenses candidate construction and is not serving reader copy.
