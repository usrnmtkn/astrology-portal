# Evidence and approval governance

## Authority classes

| Class | Writer use |
|---|---|
| `owner_authored_final` | Positive voice evidence; historical facts excluded |
| `exact_owner_approved` | Positive only when approval scope authorizes writer use |
| `owner_revised_candidate` | Contextual and contrastive only |
| `positive_direction_not_approved` | Contextual only |
| `ai_candidate_unreviewed` | Audit or contrast; never positive |
| `owner_rejected` | Negative or contrastive |
| `historical_only` | Provenance only; never active-surface positive evidence |
| `third_party_source` | Knowledge/word reference only; never Marie voice evidence |

The machine policy is `packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/authority-policy.json`.

## Approval distinctions

- Rejection: wording is negative evidence.
- Directional approval: the movement is useful, but wording is not approved.
- Preferred version: preserve as an owner-revised candidate, not final copy.
- Exact wording approval: applies only to the exact stated scope.
- Calibration-only approval: may calibrate the named judge; never writer or production evidence.
- Governed-content promotion approval: belongs to the content import/release workflow and cannot be inferred or applied by this skill.

“This is better,” “this is good,” and “this is great” are not exact approval.

## Immutable boundaries

- A judge score cannot change approval state.
- A writer candidate cannot promote itself.
- Published owner articles supply voice, not live ephemeris facts.
- Uranus-in-Cancer v3 remains calibration-only until a separate scope is explicitly approved.
- Third-party text never becomes Marie Satori phrasing.
