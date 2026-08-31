# SKY V4 reader-copy owner approval

Recorded verbatim from the owner on 2026-08-31:

```text
Owner decision: approve all canonical SKY V4 reader-facing writing.

The canonical source remains:

SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30

Canonical JSON SHA-256:

9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750

PR #455 already established owner approval for the 120 continuous
`sky-placement/article/{planet}/{sign}` records, specifically:

- placementArticle
- tldrWhat
- tldrTakeaway

I am now explicitly approving ALL remaining reader-facing SKY V4 writing
contained in that same canonical hash-bound package.

This is a bulk owner approval. I do not want to manually approve these
records one by one in Content Studio.

==================================================
1. EXPAND THE 120 CONTINUOUS RECORD APPROVAL
==================================================

For all 120 canonical continuous records:

sky-placement/article/{planet}/{sign}

retain the existing approval of:

- placementArticle
- tldrWhat
- tldrTakeaway

and additionally approve:

- fallback.hook
- fallback.lived
- fallback.turn

After this change, all reader-copy fields belonging to the 120 continuous
Sky Placement records are owner-approved.

Do not change any copy.

==================================================
2. APPROVE ALL OTHER READER-FACING SKY V4 FAMILIES
==================================================

Approve the canonical reader-copy fields for every record in these families:

- New Moon: 12
- Full Moon: 12
- Exact Eclipse Events: 4
- Sign-aware Eclipse Fallbacks: 48
- Generic Eclipse Fallbacks: 4
- Node Axes: 12
- North Node Modules: 12
- South Node Modules: 12
- Node Education: 1
- Black Moon Lilith articles: 12
- Lilith Station: 1
- Generic Retrograde Modifiers: 9
- Contextual Transit Overlays: 9
- Seasonal Context: 12

Expected additional reader-content records: 160.

Combined with the 120 continuous records, expected reader-facing
SKY V4 content records under owner approval: 280.

For each applicable record:

- `review_status = approved`
- `owner_approved = true`
- `serving_enabled = false`

Approve the reader-copy fields defined by that record's existing
`studio_editable_fields`.

Do not change structural or calculated fields.

==================================================
3. EXACT SOURCE / MODULE COPY
==================================================

This owner decision explicitly approves the canonical runtime role of the
North Node and South Node module copy included in this package.

Preserve the immutable source baseline and provenance.

Do not rewrite or replace exact owner/source copy.

Approval of its runtime role must not destroy the original source-governance
metadata.

==================================================
4. CONTEXTUAL OVERLAYS / RETROGRADES / LILITH
==================================================

This owner decision explicitly approves the canonical reader copy currently
stored for:

- contextual transit overlays
- fallbackHookOverlay copy
- generic retrograde modifiers
- Lilith article copy
- Lilith station copy
- seasonal context

Approval does not change resolver eligibility.

Trigger predicates, calculation rules, priority, suppression rules,
motion rules, and structural identity remain unchanged and read-only.

==================================================
5. ECLIPSES / LUNATIONS / NODES
==================================================

This owner decision approves the canonical reader copy as authored.

It does not authorize runtime synthesis or new combinations.

Continue to enforce the existing resolver rules:

- exact eclipse event
- sign-aware fallback
- generic fallback
- facts-only

and the existing node-axis, lunation, and aspect contracts.

==================================================
6. ASPECT COPY
==================================================

Do NOT bulk-change approval state for an unrelated pre-existing aspect corpus.

Existing governed aspect copy keeps its existing governance/approval state.

This approval concerns the canonical SKY V4 reader-facing corpus represented
by the hash above.

If any SKY V4 event-specific aspect copy is actually stored as a canonical
reader-copy record within this package, report it separately before changing
its approval state rather than inferring scope.

==================================================
7. DO NOT APPROVE CONFIGURATION AS WRITING
==================================================

Do not treat these as reader-writing approval:

- the 24 Mustache/template records
- `sky-v4/settings/contextual-overlays`

Leave their current configuration/governance status unchanged unless a
different state is technically required for the already-approved runtime
architecture.

They do not need individual Content Studio prose approval.

If leaving them at `needs_review` would incorrectly make Content Studio
present them to me as outstanding WRITING review, change the UI/category so
they are clearly configuration/template records rather than reader-copy
review tasks.

Do not falsely mark them owner-approved prose merely to clear a counter.

==================================================
8. HASH-BOUND GOVERNANCE
==================================================

Implement this using the same hash-bound owner-approval approach established
for the 120 continuous articles.

The approval must apply ONLY while the canonical source hash remains:

9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750

Any future change to reader copy creates a new draft/version and must not
inherit this owner approval automatically unless the existing versioning
contract explicitly preserves the old approved version separately.

Do not mutate the canonical source to encode approval.

Keep approval metadata/governance separate from immutable canonical copy.

==================================================
9. SERVING REMAINS OFF
==================================================

This is editorial owner approval only.

Do NOT enable serving.

For all SKY V4 records:

`serving_enabled=false`

Approved records must continue to materialize as non-serving content until I
give a separate explicit serving decision.

Do not make approval imply publication.

==================================================
10. VERIFICATION
==================================================

Before opening the PR, verify:

- canonical JSON SHA remains exactly
  9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750

- copy drift = 0

- 120 continuous records have all six reader-copy fields approved:
  tldrWhat
  tldrTakeaway
  placementArticle
  fallback.hook
  fallback.lived
  fallback.turn

- 160 additional reader-content records are owner-approved

- expected total reader-facing approved records = 280

- no unrelated aspect corpus was bulk-approved

- Mustache/templates and overlay settings were not falsely promoted as
  reader prose

- serving remains OFF for every SKY V4 record

- source baselines remain immutable

- Content Studio no longer asks me to individually approve any of these
  canonical reader-copy records

==================================================
11. REPORT AND STOP
==================================================

Open a PR with the governance change.

Report:

1. PR number
2. commit SHA
3. exact approval ledger / manifest
4. count by content family
5. total approved reader-facing records
6. exact fields approved on continuous records
7. confirmation that fallback Hook/Lived/Turn are now approved
8. confirmation that canonical copy hash is unchanged
9. copy drift result
10. state of the 24 templates and overlay-settings record
11. confirmation that serving remains OFF
12. test / CI results

Do not merge automatically.
Do not enable serving.
Stop at the owner review wall.
```
