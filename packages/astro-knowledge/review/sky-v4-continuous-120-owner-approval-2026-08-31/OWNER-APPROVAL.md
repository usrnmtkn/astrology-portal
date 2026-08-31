# SKY V4 continuous placement owner approval

Date: 2026-08-31

Canonical JSON SHA-256: `9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750`

The following owner instruction is recorded verbatim:

> Owner decision:
>
> I approve the 120 canonical continuous SKY V4 Sky Placement articles from Sun through Chiron.
>
> Change the approval state for exactly these canonical records:
>
> sky-placement/article/{planet}/{sign}
>
> for:
> Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, and Chiron
> across all 12 signs.
>
> Expected count: 120 records.
>
> For these 120 records only:
>
> - change `review_status` from `needs_review` to `approved`
> - change `owner_approved` from `false` to `true`
>
> Do NOT change the reader copy.
> Copy must remain byte-identical to canonical JSON SHA-256:
>
> 9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750
>
> Do NOT enable serving yet.
>
> Keep:
> `serving_enabled=false`
>
> This approval applies to the canonical `placementArticle`, TLDR What, TLDR Takeaway, and the continuous Sky Placement record as authored.
>
> Do not infer approval for any other SKY V4 family.
>
> Specifically, do NOT automatically approve:
>
> - New Moons
> - Full Moons
> - eclipses
> - Nodes
> - Lilith
> - retrograde modifiers
> - contextual transit overlays
> - aspect copy
> - seasonal context
>
> Also do not infer approval for the 120 exact Hook/Lived/Turn fallback compositions unless I separately approve those.
>
> Implement this as an owner-approval metadata/governance change only.
>
> Report:
>
> 1. exact 120 content keys changed
> 2. before/after approval state
> 3. confirmation that copy drift is zero
> 4. confirmation that serving remains OFF
> 5. any code/governance change required to permit owner approval of this staged package
>
> Stop after the approval-state update.
> Do not enable serving.

The exact approved keys are recorded in `apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-120-owner-approval-v1.json`. This record authorizes approval metadata only. It does not authorize a serving release.
