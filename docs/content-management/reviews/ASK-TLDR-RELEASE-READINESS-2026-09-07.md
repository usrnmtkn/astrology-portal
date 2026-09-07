# Ask TLDR readiness after current-main integration

Checked September 7, 2026. Preview code reviewed: `25921310`; main integrated: `5620121d`; local merge: `e46e3b15`. This is a draft PR readiness record, not content approval or a production release.

## Verification

- Ask TLDR contract CI and the Vercel preview succeeded for `25921310`.
- Main merged without conflicts; the feature branch is no longer behind the checked main.
- All Ask TLDR contract tests, API import, Content Studio build, and web build pass after integration.
- The Calendar major-exact routing test now passes: the current-main fixture supplies all 379 canonical rows and 758 routed directions.
- The writing-kernel drift failure reproduces on isolated, unchanged main: `api/_lib/transit-reading-generation.ts|provider_call`.

## Bundle comparison

Both checkouts used independent npm installs and fresh builds with the same Node runtime.

| Measurement | Main | Ask TLDR |
| --- | ---: | ---: |
| Total JavaScript, gzip level 9 | 2,899,495 bytes | 2,906,215 bytes |
| Aggregate limit | 2,900,000 bytes | 2,900,000 bytes |

Ask TLDR adds 6,720 bytes and exceeds the aggregate limit by 6,215 bytes. This failure must not be classified as a main baseline failure. Reader CSS and deferred Sky-detail limits also fail on main. No limits were changed. Public release remains blocked pending a budget resolution and the other release gates.

## Governed-meaning gaps

The frozen-facts audit has 37 ready questions and 17 blocked primary meanings. All six Career questions are ready in this fixture. These counts are not coverage guarantees for every chart.

| Question | Missing or incomplete technique | Calculated factor |
| --- | --- | --- |
| `self.outgrowing` | `solar_return_overlay` | `solar-return-overlay:uranus:house-12` |
| `self.underestimating` | `natal_placement` | `natal-angle:ascendant` |
| `self.pulled_two_directions` | `natal_placement` | `natal-angle:ascendant` |
| `love.needs` | `natal_placement` | `natal-placement:neptune` |
| `love.repeating` | `natal_placement` | `natal-placement:neptune` |
| `love.gets_under_skin` | `natal_placement` | `natal-placement:neptune` |
| `money.prioritize` | `solar_return_overlay` | `solar-return-overlay:jupiter:house-2` |
| `money.changing` | `solar_return_overlay` | `solar-return-overlay:jupiter:house-2` |
| `money.risk` | `solar_return_overlay` | `solar-return-overlay:jupiter:house-2` |
| `money.attention` | `solar_return_overlay` | `solar-return-overlay:jupiter:house-2` |
| `home_family.pattern` | `natal_placement` | `natal-placement:saturn` |
| `social.belong` | `solar_return_overlay` | `solar-return-overlay:chiron:house-11` |
| `social.outgrowing_friends` | `solar_return_overlay` | `solar-return-overlay:chiron:house-11` |
| `social.stay_included` | `solar_return_overlay` | `solar-return-overlay:saturn:house-11` |
| `spirituality.time_alone` | `profection` | `profection:annual:12` |
| `spirituality.let_go` | `profection` | `profection:annual:12` |
| `spirituality.intuition` | `natal_placement` | `natal-placement:mars` |

Generic house/body doctrine is insufficient for Solar Return or profection technique claims. Missing natal-placement evidence needs an exact approved source mapping. Do not fill gaps by inventing interpretations or silently swapping away from a stronger primary factor. Historical recurrence lookup remains unavailable; repeated passes in a supplied arc are not a previous-cycle calculation.

## Fresh model review

The first live Career recognition preview on `25921310` failed with `ASK_TLDR_JUDGE_FINDING_EVIDENCE_INVALID`. No new review draft was saved. The judge schema allowed arbitrary citation strings although the deterministic validator required exact supplied IDs. The fix constrains both evidence and owner-passage citation arrays to the supplied IDs at the provider boundary; deterministic rejection remains intact. Judge, provider, and pipeline regressions pass. A post-deployment retry is pending; no fresh answer has been approved or promoted.
