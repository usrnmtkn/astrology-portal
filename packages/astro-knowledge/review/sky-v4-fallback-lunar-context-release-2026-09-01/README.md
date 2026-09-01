# SKY V4 fallback correction and lunar-context approval record

Date: 2026-09-01

## Authoritative handoff

- `SKY-V4-CONTINUOUS-FALLBACK-REWRITE-LUNAR-CONTEXT-DRAFT-2026-09-01.json`
  - SHA-256: `450eac515db908ea82a02869f308ac9ae5f97e272b2308c7c975e4c02245a08a`
- `SKY-V4-FALLBACK-AND-LUNAR-CONTEXT-OWNER-REVIEW-2026-09-01.xlsx`
  - SHA-256: `3551cb36c6f6181bf7f4f284999d40126f79b22661043ea2b7f585b9ee244418`

The source handoff arrived as `OWNER_REVIEW_REQUIRED` with serving disabled.

## Owner approval and serving authorization

Recorded verbatim, 2026-09-01:

> “I approve the 120 continuous corrections and 40 lunar-context records for serving and authorize their Content Studio baselines.”

## Approved serving scope

- 120 continuous-placement correction records: TLDR What, TLDR Takeaway,
  Hook, Lived, Turn, and the two supplied article replacements.
- 40 placement lunar-context records: New Moon, Full Moon, Solar Eclipse,
  and Lunar Eclipse for each of the ten continuous-placement planets.
- Content Studio groups each continuous placement's six fields together.
- Content Studio groups each lunar record's full-page and fallback fields
  together.

## Governance state

The two hash-bound manifests now carry `review_status: approved`,
`owner_approved: true`, and `serving_enabled: true`, with explicit approval
and release identifiers. Runtime adapters still fail closed if any part of
that release contract is absent. Future Content Studio edits fork a
non-serving draft and preserve these exact approved baselines.

The historical SKY V4 canonical package and its SHA-256 remain unchanged.
