# Sky Placement judge: Terra-low rubric rerun

Date: 2026-08-02 (America/New_York)

## Decision

Do not promote Sol-xhigh. The earlier targeted comparison produced identical classifications across the nine cases while Sol cost more and took longer. Terra-low remains the preferred future routine judge configuration, but this directional run did not change the production registry. The repository still names `gpt-4.1-mini` as the active Sky Placement judge.

## What changed

The shared Sky Placement voice contract is now version 5. It adds four explicit rules:

1. A central first-read natural-English failure plus generalized supporting copy is score 1. Three reviewed opaque constructions are also deterministic linter failures.
2. Current Sky second person includes `you`, `your`, `yours`, `yourself`, and `yourselves`. It remains a publication blocker and cannot receive judge score 3.
3. `people`, `someone`, and `we` are allowed collective language. They are concerns only when they conceal behavior that should be named.
4. A slogan, metaphor, reassurance, or second conclusion after the cost has landed is marked for deletion and usually lowers an otherwise strong article to score 2 without requiring a full rewrite.

The rubric also states that score 3 does not require flawless prose. One minor explanatory or broad sentence is acceptable when the placement is unmistakable, the lived section is concrete, the turn names behavior and consequence, hard surface rules pass, and no central sentence fails natural English.

The same guidance now reaches both the generator and the judge. No article copy or approval state changed.

## Nine-call result

| Case | Previous Terra | New model score | Effective score | Result |
| --- | ---: | ---: | ---: | --- |
| target-001 | 2 | 2 | 2 | unchanged |
| target-002 | 3 | 3 | 3 | unchanged |
| target-003 | 2 | 2 | 2 | unchanged; publication blocked by second person |
| target-004 | 2 | 3 | 2 | model liked the prose; mechanical second-person rule caps it |
| target-005 | 1 | 1 | 1 | unchanged |
| target-006 | 2 | 1 | 1 | corrected to off-voice |
| target-007 | 2 | 2 | 2 | unchanged |
| target-008 | 2 | 3 | 3 | corrected by score-3 tolerance |
| target-009 | 2 | 2 | 2 | unchanged |

Target 006 now receives the intended diagnosis: “The banished want refuses to stay reasonable” is opaque personification, and the lived section remains generalized instead of showing a recognizable Venus-in-Virgo sequence.

Target 008 also changed, consistently with the new rubric. Terra identified “This can make relationships feel complicated” as broad but minor; the rest of the article is concrete, placement-specific, and behaviorally grounded. Penalizing the whole article for that single sentence would contradict the new score-3 tolerance rule.

## Operations

- Calls: 9
- Estimated total cost: $0.0732325
- Estimated cost per call: $0.00813694
- Average latency: 3.63 seconds
- Input tokens: 18,988
- Output tokens: 2,148
- Reasoning tokens: 1,540
- Schema failures: 0
- Runtime model changes: 0
- Content promotions: 0
- Candidate adaptations marked owner-approved: 0

The full local case-by-case output is in `out/sky-placement-judge-terra-rubric-v4/terra-review.md`. That experimental output directory remains untracked by design.
