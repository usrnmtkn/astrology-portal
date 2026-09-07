# Ask TLDR decision review — September 7, 2026

This review continues draft PR #642 from remote commit `5ecba819` on
`chatgpt/ask-tldr-content-studio-preview`. The local continuation is
`codex/ask-tldr-consolidated`, created in an isolated worktree with its own
installed dependencies. At review time it is 51 commits ahead of and 110 behind
refreshed `origin/main` (refreshed September 7). Both earlier recovery worktrees are preserved. The nine final browser test commits
are included in this consolidated base.
The changes here are local; this document does not authorize release or approve
reader wording.

## Decisions retained

| Decision | Reason |
| --- | --- |
| Calculations, governed meaning, question relevance, and owner voice remain separate inputs | A plausible interpretation or owner example is not a calculated fact about this chart. |
| One writer, one judge, and at most one rewrite/re-judge | The bounded correction is useful without an indefinite generation loop. |
| Owner notes become durable only through explicit promotion, and can be revoked | A rejected answer or model criticism alone must not become editorial policy. |
| Advice must explain its astrological basis and practical consequence | An actionable checklist can still be generic; the evidence must sharpen the recommendation. |
| Public runtime stays off and drafts remain review-held | Passing mechanical checks or a model judge does not approve wording. |
| Historical comparisons require supplied calculated occurrences | Orbital-period guesses and invented personal history are not acceptable evidence. A repeated pass within an arc does not establish the previous historical cycle. |
| Solar-eclipse meaning remains excluded while its source is review-held | The owner's example is a product direction, not authorization to invent or promote missing meaning. |

## Corrections implemented

1. **Resolve contradictory answer formats.** The base writer and validator required
   `Why the astrology points here`, but the question-bound writer and judge required
   a different final label. There is now one shared heading, one explanatory final
   paragraph, and a validator that rejects missing, empty, duplicate, or misplaced
   support sections. The existing heading is retained; this is not a new typography
   or component treatment. The browser's updated synthetic test answers are retained, alongside the local
   structure and evidence regressions.
2. **Remove forced synthesis.** Two eligible factors do not necessarily reinforce
   each other. The schema no longer forces a second citation. The writer must show
   a supported relationship when a second factor materially helps. Shared houses
   alone do not establish amplification.
3. **Avoid a predetermined Career conclusion.** Scope, authority, resources,
   recognition, and ownership remain useful distinctions when supported. Every
   Career answer need not end with the same responsibility-versus-authority advice.
4. **Use calculated eclipse type.** The remote eligibility filter looked for
   `lunar_eclipse` in an ID, while the frozen calculator fixture uses hyphenated IDs.
   Eligibility now reads `facts.kind`. Opaque IDs work; a misleading lunar-looking
   ID cannot authorize solar-eclipse meaning. The regression follows an eligible
   Career lunar eclipse into the actual prepared packet and approved meaning lane.
5. **Strengthen the fact lock.** Named dates with explicit years must match the
   evidence, not merely its month/day. Eclipse types must be declared, and directly
   stated eclipse houses must match the event's calculated natal house rather than
   a contacted point's house. The fact lock preserves the writer's declaration
   order so the judge does not reject valid reordered citations.

6. **Make governance tests inspect real records.** The final browser test helper
   omitted the actual `packet.evidence` field. It now reads that field and asserts
   that both lunar mechanism records are inspected, preventing an empty loop from
   passing the authority checks. The browser also asserted a nonexistent
   `factual_only` source kind for partial profection evidence; the test now checks
   the actual knowledge-index provenance and retained house doctrine while still
   requiring the primary profection packet to remain blocked.

## Validation and limits

The Ask TLDR contract suite, writer/rewrite/re-judge provider harness, API import,
Content Studio build, and web build pass. Regressions cover the single support
format, nonempty support sections, optional supporting citations, opaque eclipse
IDs, unsupported eclipse kinds, eclipse event-versus-contact houses, explicit
years, evidence ordering, and non-serving release boundaries.

The 54-question frozen-facts audit passes with 37 primary-question-ready cases
and 17 cases blocked by incomplete governed meaning. All six Career cases are
ready in this fixture. The previous recovery audit had 32 ready cases; these
counts describe the supplied fixture, not coverage for every chart.

Provider tests use synthetic responses and mocked judge scores. They verify
plumbing and constraints, not the editorial quality of a newly generated answer.
No live model generation, owner-session browser review, publication, or production
deployment was performed. The fact lock recognizes specific language patterns;
the semantic judge remains necessary for unsupported paraphrases, causal claims,
and dates attributed to the wrong event. No general historical ephemeris search
was added.

Before release, exercise fresh owner previews across several questions and charts.
Assess whether the explanation changes the reasoning, whether supporting factors
add real value, and whether dates remain attached to the correct events. Approval
must apply to exact generated wording, not this review or a judge score.
