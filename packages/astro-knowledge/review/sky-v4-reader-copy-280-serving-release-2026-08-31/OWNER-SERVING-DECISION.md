# Owner serving decision: SKY V4 reader copy, 280 records

Date: 2026-08-31

Recorded verbatim:

> Owner serving decision:
>
> PR #456 has completed the bulk owner approval of the canonical SKY V4
> reader-facing corpus.
>
> I now explicitly authorize the 280 owner-approved reader-facing SKY V4
> records to serve to users according to the existing canonical resolver rules.
>
> Canonical package:
> SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30
>
> Canonical JSON SHA-256:
> 9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750
>
> For exactly the 280 records present in:
> sky-v4-reader-copy-280-owner-approval-v1.json
>
> change serving eligibility from:
>
> serving_enabled=false
>
> to:
>
> serving_enabled=true
>
> Do not change:
>
> - reader copy
> - approval fields
> - ContentKey
> - structural/calculated astrology
> - resolver precedence
> - overlay triggers
> - aspect eligibility
> - eclipse/node/lunation matching
> - seasonal hemisphere rules
>
> Copy drift must remain zero.
>
> The 24 template records and `sky-v4/settings/contextual-overlays` are
> configuration, not reader prose. Do not surface those records directly as
> reader content.
>
> Existing governed aspect copy remains governed by its existing approval
> system. Do not bulk-promote unrelated aspect records.
>
> Serving must remain conditional on the existing resolver.
>
> Examples:
>
> - continuous article serves only on the matching planet/sign route
> - retrograde copy only during the applicable retrograde
> - contextual overlay only when its exact reviewed trigger matches
> - New/Full Moon only for matching lunations
> - exact eclipse → sign-aware fallback → generic fallback → facts-only
> - Nodes use the matching current axis/module
> - Lilith station only when calculation supports the station
> - seasonal context remains hemisphere-aware
> - unsupported/unapproved aspects omit
>
> Content Studio must preserve the current approved serving version when I make
> future edits. Any future edit must create a new non-serving draft and must not
> replace the approved serving copy without another explicit approval.
>
> Before merge, prove actual reader-runtime serving for representative routes:
>
> 1. continuous Sun placement
> 2. continuous Mercury placement
> 3. Venus placement with contextual overlay
> 4. placement with retrograde
> 5. placement with approved governed aspect
> 6. New Moon
> 7. Full Moon with correct axis
> 8. exact eclipse
> 9. sign-aware eclipse fallback
> 10. generic eclipse fallback
> 11. Node axis
> 12. North Node module
> 13. South Node module
> 14. Lilith article
> 15. Lilith station when supported
> 16. seasonal context
> 17. zero-optional-condition placement
>
> For every representative route verify:
>
> - intended canonical key selected
> - serving version selected, not draft
> - exact canonical copy preserved
> - no natal-placement substitution
> - no generated unapproved prose
> - correct resolver ordering
> - no duplicate conditions/overlays/aspects
>
> Report:
>
> - PR number
> - commit SHA
> - exact serving-release ledger
> - 280/280 serving-enabled count
> - counts by family
> - canonical hash
> - copy drift
> - reader-route regression results
> - any approved record that still cannot reach a reader route and why
> - CI results
>
> Do not merge automatically.
> Stop at the final serving review wall.
