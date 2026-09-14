# Placement Key dates and inline aspect lists

The owner requested calculated aspects in every Sky Placement write-up's Key
dates, and comma-separated aspect facts when used inside a Placement article.

The timeline now merges the placement's calculated exact aspect hits with its
existing ingress, exit, shadow, station, and residency-range entries. It sorts
by the actual timestamp and displays dates in the placement's time zone.
Duplicate inputs are removed; distinct repeat hits remain separate. Facts must
match the requested planet and sign. Existing aspect coverage is unchanged:
major aspects to Sun, Mercury through Pluto, and Lilith, excluding Moon as the
counterpart. Moon, Chiron, Lilith, and both nodes remain supported subjects.

Placement and retrograde routes request the full aspect list regardless of
article token usage. Calendar links into those articles also fetch the matching
placement facts. All calculations stay in the existing ephemeris worker.

Within shared, direct, and retrograde Placement articles, `aspectsInSign` and
`aspectsWhileRetrograde` expand into comma-separated prose with no leading
hyphen. This also applies when a reusable phrase contains an aspect token.
Section templates retain their existing multiline list format. Editor tokens,
source hashes, publication checks, and authored prose are preserved.

The reader package is rebuilt as `v3-2026-09-14b`; its manifests, version pins,
and knowledge-index source hashes are regenerated. This accompanies the pending
card/article time-zone fix in PR #807.

Verification:

- `scripts/test-sky-placement-key-date-aspects.mts` checks all 14 Sky bodies plus
  a second Mercury occurrence. It covers exact-hit inclusion and order, repeated
  hits, input deduplication, wrong-sign exclusion, actual app adapter delivery,
  comma output, and preserved section-template lists. Sun and Mercury exact
  aspect angles/signs are checked against direct ephemeris snapshots.
- The Sun-in-Virgo fixture asserts all eight requested rows, including both
  Sun–Lilith trines on September 2 and September 10.
- Article-variable tests compare Node, browser source, shipped bundle, and
  Studio preview, including nested phrases and source-hash protection.
- Fresh reader browser checks cover mobile/desktop, articles with and without
  aspect tokens, date variables, existing aspect cards, navigation, reload, and
  Calendar ingress entry. The previous card/article time-zone checks remain.
- Full Content Studio API contract, typecheck, CSS/token audit, package/index
  freshness, and repository/staged/built-reader privacy checks are run before
  release. The PR records the tested head and CI result.

Broader baseline limitations: the content suite stops at the existing protected
natal-aspect hash assertion (`7469bac8…` versus pinned `087d8486…`). The old
reviewed-aspect test expects 248 transit records; unchanged main contains 439.
The Sky-aspect suite's calculation matrix, Calendar routing parity, and current
adapter pass, then its integration test stops at an outdated judge-prompt text
assertion. These sources and assertions are untouched by this change. No
protected prose or review policy is changed to make these checks pass.
