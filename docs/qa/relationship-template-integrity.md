# Relationship template integrity

Owner direction: `thread:01a10c91-1672-7511-becc-bf8ba3189ee0`, October 5, 2026.

Select one stored revision, select `you` or `friend`, interpolate declared
variables, and display. Stored package aliases are `body_you` and `body_they`.
Both fields must exist. A missing field is a source gap, never permission to
borrow the other perspective or another revision. Display position cannot
replace an existing exact-aspect source with a family variant.

The reported Mars discrepancy was a revision mismatch: the supplied passage
existed in saved draft history while the local review artifact showed a later
regenerated draft. Its generator also iterated only regenerated audiences,
omitting three existing counterparts. Private exact passages and database
snapshots remain outside Git. This task changes no authored content or approval.

`relationshipTemplate.mjs` is the shared deterministic selection/interpolation
boundary. It preserves literal replacement values and all other source bytes.
Node and browser resolvers share it; the shipped artifact is rebuilt. Studio
exposes complete explicit versions using `bondEffectVersionsFromPayload` and
renders both directions. An incomplete historical version remains incomplete.
The editor cannot fill absent draft fields from its baseline. Dashboard
packaging and the bond card adapter preserve the authored strings.

| Acceptance criterion | Result |
| --- | --- |
| Exact supplied historical pair read through actual authenticated inventory handler | Passed; private receipt |
| Storage and publication equality before/after | Passed; no mutations |
| Canonical pairs | 139 complete; no source changes |
| Current Studio records | 140 complete; 148 baseline/draft pairs checked |
| Historical revision audit | 35 checked; three missing friend fields and four legacy revisions without directional fields flagged |
| Exact interpolation, punctuation, whitespace and literal dollar signs | Passed |
| Missing perspective/variable refusal and exact-source priority | Passed |
| Node, browser source and shipped distribution parity | Passed |
| Fresh-build Studio UI; both perspectives and revision selection | Passed on desktop/mobile, light/dark |
| Existing Friends Studio browser flows | Five passed |
| Full Content Studio API suite, typecheck, CSS audit and manifest check | Passed |
| Production deployment | Not performed |

Regressions: `scripts/test-relationship-template-integrity.mts`,
`scripts/audit-relationship-template-pairs.mjs`, and
`tests/visual/relationship-template-integrity.spec.ts`.
The test accepts a private `RELATIONSHIP_TEMPLATE_FIXTURE` JSON path.
Committed SHA-256 assertions pin both exact historical Mars fields. Local release
checks supply the protected fixture; it is never committed or uploaded. The
Relationship template integrity workflow exercises the same byte-exact path
with synthetic saved revisions, the existing canonical Mars pair, and the full
pair audit. Exact historical fixture checks fail if either recorded hash changes.
The full inventory-shape fixture retains all 140 records and 35 historical
entries with synthetic field values. It verifies all 148 current pairs and
all seven incomplete historical records, including four legacy revisions with
neither directional field. Canonical source coverage checks all 139 pairs.

The older `test-fallback-refresh-wiring.mjs` has an unrelated Chiron/Jupiter
sentence expectation failure. The same failure was reproduced using the
unmodified base distribution and base test at `055d77c83`. It is not a pass;
no prose or assertion was changed to mask it.

Release bundle measurement: independent npm-ci builds on main `0e3edf573`
and the pipeline patch measure 3,544,110 versus 3,545,268 aggregate gzip bytes
(+1,158) and 518,028 versus 518,359 reader-boot bytes (+331). The hosted patch
measures 3,545,196 aggregate bytes. Only the measured reader-boot and aggregate
ceilings are reconciled; app boot, CSS and individual chunk caps are unchanged.
The standalone Studio entry is 775,347 raw / 225,651 gzip bytes; its entry limits
are reconciled while aggregate and memory limits stay unchanged. This is the
implementation cost of revision/pair/interpolation controls, with no prose or
dependency changes. See the rationale in both bundle-budget files.
