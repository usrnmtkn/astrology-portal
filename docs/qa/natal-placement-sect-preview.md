# Natal placement and sect preview

Local acceptance was completed on 2026-10-26 on
`feat/approved-natal-pilot-20261026`, based on main
`66a51e73b29369ae17d1f84b94bf1d9c44e9c446`. The checkout has its own `npm ci`
dependencies and generated knowledge package. These results describe an
uncommitted local integration, not a production deployment or hosted import.

## Scope and selection

The existing 46 natal editorial identities retain their bodies and keys.
Day & night supports the general planet passage, a selected sign in all houses,
or a selected sign and whole-sign house. Scoped keys are:

```text
cms/natal-planet-sect/{you|they}/{planet}/{sign}/{day|night}
cms/natal-planet-sect/{you|they}/{planet}/{sign}/house-{1..12}/{day|night}
```

The supported planets are Jupiter, Venus, Mars and Saturn. The admission handler
requires the reusable editorial scope, audience and key to match the saved facts,
including the optional house and whole-sign house system. Normal draft, review,
version and publication controls apply. No personal report receives global
publication permission through this exception.

The eight approved pilot bodies stay outside Git. Four Jupiter passages apply
only to Leo in the third house, and four Saturn passages apply to Aries in any
house, covering both sects and audiences. Wording approval is recorded separately
from publication authority. The prepared import payloads remain unpublished;
a read-only hosted check found no existing row at any of these eight keys.
Recheck destinations and opened versions before an eventual hosted import.

For reliably timed natal charts, the reader calculates the house from the planet
and Ascendant signs and sect from the solar horizon. It requests the exact-house,
sign-only and general keys, then selects one complete eligible body in that
order. Draft, missing and review-held rows do not displace broader published
copy. Explicit retirement suppresses broader fallback until a later restore.
Unknown birth time still suppresses sect. Existing sign, house and aspect prose
remain separate and unchanged. Names replace `{{ownerName}}` only at render time.

## Local acceptance

| Criterion | Result | Evidence |
| --- | --- | --- |
| Existing 46 sources preserved; eight correctly scoped identities | Passed | `scripts/test-natal-editorial-library.mts`, including byte-identical existing-row assertions |
| Create, reopen, stale-edit rejection, review, publication and reader eligibility | Passed | Actual handlers with isolated storage in editorial library tests; unfiltered `test:content-studio-api` |
| Exact eight private bodies save/reopen unchanged as drafts | Passed | Private opt-in editorial tests and import-payload verification; every SHA-256 checked; zero hosted writes |
| House/sign/general precedence, both audiences and sects, all twelve houses, unknown time and retirement | Passed | `scripts/test-natal-chart-readings.mts`; independent horizon calculation checks |
| Studio discovery, full editing, save, reload, comparison, empty/error/retry and preview-name changes | Passed | 16 fresh-build browser cases: both scopes and sects in light/dark at 390/1440 widths; each covers You and Friend |
| Exact approved reader openings and endings, one sect body, intact existing copy after reload | Passed | Eight fresh-build reader cases using calculated synthetic charts and optional private approved bodies; each covers You and Friend |
| Heading style/order and no horizontal overflow | Passed | Studio browser assertions and inspected mobile/desktop screenshots |
| Preview name bounds, sign-only preview and no invented house paragraph | Passed | `scripts/test-admin-natal-placement-preview-api.mjs` |
| Complete designated voice, corrections and approved supplementary reference reach the request | Passed | Canonical harness preparation and intercepted provider transport; 19 governance tests; zero paid calls |
| Web/Admin/server types, CSS, reader-copy boundary and privacy | Passed | Existing checks; both built-asset directories scanned; no private pilot prose in shipped code |
| Standalone Admin and web bundle boundaries | Passed | Existing budget scripts; comparison is a required independent dynamic entry |
| Hosted save, owner publication, deployed main and rendered production bodies | Unverified | No release or hosted publication has been performed for these eight |

The first full API attempt stopped on local IPC permission; the complete suite
was restarted with that prerequisite available and exited successfully. The
initial browser build encountered knowledge generation still in progress;
the subsequent fresh-build run passed all 24 cases. Neither failed attempt is
counted as acceptance evidence.

Matched standalone main/feature builds on native Node 22.20.0 measure entry
raw/gzip 808060/234167 versus 808072/234179 bytes, and aggregate gzip
843104 versus 845624 bytes. The requested feature adds 2520 aggregate bytes.
The narrow aggregate allocation is recorded in `scripts/admin-bundle-budgets.json`;
entry, largest-chunk, graph, private-payload and runtime guards are unchanged.
This records feature cost, not a performance improvement.

## Writer boundary

The `natal-placement-sect/v2` family uses the canonical harness with complete
private natal style references, scoped current corrections and separately
licensed astrology meaning. Optional approved voice sources require their full
text, exact hash, resolvable approval and voice-only role. Rejections remain
negative evidence. The family still requires a specific whole-sign house;
sign-only Studio storage does not silently broaden that writer contract.

The approved Jupiter examples have been included as complete supplementary
voice evidence in private prepared You/Friend request packets, alongside the
four designated natal-aspect references. Intercepted transport checks confirm
delivery; no shared saved profile was changed and no new live model ran. Request
checks do not establish literary quality or approve later output. A new draft
needs the existing billed-call authority and owner review. No automatic judge,
revision, promotion or publication is added.

Historical third-house meanings and later communication/learning applications
retain separate provenance. Knowing Leo's ruler is the Sun does not establish
the Sun's placement or condition. Aspects, degrees, time lords and personal
circumstances are not invented for these editorial combinations.


## Current-main preparation, October 26, 2026

The pilot is rebased onto main `5eddffa5d38ac38b594781f576ba24387d439b6d`.
The eight exact approved bodies remain private and unchanged. The owner
subsequently authorized code release and publication of all eight in
`call_cb9ceaa874444be69ea6d3abfe6c7995` with “Deploy and publish all eight.”
Merge, deployment and production content writes remain queued behind the
preceding release and the coordinator's explicit handoff. No new model call
or reader wording change is part of this preparation.

Current-main web, standalone Admin and server types, actual natal editorial and
preview handlers, reader scope selection, writer governance, CSS and reader-copy
boundaries pass. Both source-row and fallback-package directories remain
byte-identical to main. All 167 current-main API commands are retained and the
pilot writer contract is appended once, for 168 commands. The complete API gate
and hosted checks on the final PR revision remain release requirements.

The fresh browser run retained 23 passing cases and one mobile close/reopen
failure. The failed Jupiter day/Friend case opened the next article while
browser-back navigation was still asynchronous. The test now waits for its
exact prior list URL and disappearance of the old article before clicking
Saturn. All original copy assertions and timeouts are unchanged; the four
affected Jupiter variants pass from a fresh build. The original failed receipt
and traces are preserved privately. No application navigation change or
assertion waiver is claimed. The earlier setup attempt stopped before tests
because the private configuration lacked an explicit server working directory;
that attempt is not acceptance evidence.

Fresh matched standalone builds use the existing independent npm-ci installs,
identical lockfile and visual-smoke URL/anonymous-key placeholders, with no
publishable key. Native Node 22.23.3 arm64 with zlib 1.3.1-e00f703 measures:

| Metric | Main | Pilot | Difference |
| --- | ---: | ---: | ---: |
| Entry raw bytes | 808624 | 808636 | +12 |
| Entry gzip bytes | 234504 | 234504 | 0 |
| Aggregate gzip bytes | 844039 | 846561 | +2522 |
| JavaScript chunks | 92 | 93 | +1 |

The existing 2550-byte feature allocation is added to main's independent Friend
release allocation, giving an aggregate ceiling of 846650 and 89 measured bytes
of headroom. Entry, largest-chunk, startup, runtime, private-payload and deferred
comparison guards are unchanged. This records the requested interface cost,
not a performance improvement. The historical measurements above remain tied
to their earlier baseline.
