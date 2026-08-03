# Marie Satori writer environment implementation

Date: August 2, 2026

## Writer and judge separation

The repository now defines an inert workflow lane, `writer:sky-placement`, in `config/marie-satori-writer-policy-v1.json`. It is a Codex editorial workflow, not a runtime model-registry release. No writer lane was added to `editorial-model-registry.json`.

The workflow runs in this order:

1. validate facts and surface;
2. compile ranked evidence;
3. identify one lived pressure and sequence;
4. draft and line-edit;
5. run deterministic lint;
6. complete the authorship audit and rewrite failures;
7. use Terra-low only as the final acceptability judge when a billed call is explicitly authorized;
8. return a review candidate without changing approval or promotion state.

## Repository structure

```text
.agents/skills/marie-satori-writer/
  SKILL.md
  agents/openai.yaml
  references/
  scripts/

packages/astro-knowledge/
  config/
    marie-satori-writer-policy-v1.json
    sky-placement-writer-evaluation-v1.json
  voice/tldr-astro/marie-satori-writer/
    authority-policy.json
    contrastive-edits.json
    failure-tags.json
    negative-examples.json
    voice-index.json
  schema/
    marie-satori-contrastive-edits.schema.json
    marie-satori-voice-index.schema.json
  review/
    sky-placement-voice-pass-v7-writer-candidates.json
    sky-placement-voice-pass-v7-authorship-attestations.json
    sky-placement-voice-pass-v7-before-after.md
```

`AGENTS.md` routes TLDR Astro write, rewrite, refine, compare, and approval-candidate requests through the skill. Exact approval is still recorded only after an explicit owner statement about exact stored wording.

## Governed corpus

The generated index contains 3,807 excerpts. Current counts:

| Authority class | Excerpts | Positive voice evidence |
| --- | ---: | --- |
| `owner_authored_final` | 3,390 | yes |
| `exact_owner_approved` | 8 | only when provenance permits; calibration-only v3 is excluded |
| `ai_candidate_unreviewed` | 168 | no |
| `historical_only` | 49 | no |
| `owner_rejected` | 14 | no; negative evidence |
| `positive_direction_not_approved` | 4 | no; contextual only |
| `owner_revised_candidate` | 2 | no; contextual only |
| `third_party_source` | 172 | no |

The index includes source text, source path, authorship, origin, surface, placement metadata, beat, function, authority, review and editorial states, evidence permissions, failure tags, provenance, and a SHA-256 source hash.

## Contrastive memory

The first dataset contains seven high-value owner-edit records. It prioritizes changes already made in review:

- abstract disappearance to exact lost evenings, weekends, and days off;
- explanation to agreement-then-cancellation behavior;
- category inventory to one denial/evidence sequence;
- generic family role to birthdays, spare key, and emergency calls;
- vague room change to guest-room-to-office;
- stability to connection and heavy obligation;
- “carry too much” to a direct demand and cost.

The dataset distinguishes directional evidence from exact approval. It does not fabricate reasons; every stored reason is labeled by provenance.

## Retrieval compiler

The packet compiler returns:

- the surface contract;
- exact checked-in placement facts;
- five governed owner excerpts, at most one per source;
- up to four contrastive edits;
- two negative examples;
- vocabulary and banned-pattern paths;
- the current candidate and governance state;
- a human-readable explanation for every selection.

Ranking prioritizes surface, writing defect or goal, article beat, planet, sign, and candidate-language overlap. Older published surfaces may contain second person; packet governance states that those excerpts guide diction and pressure-consequence logic while the Current Sky contract remains controlling.

## Authorship gate

The authorship tool combines deterministic checks with an explicit semantic attestation. A clean linter is insufficient. Missing sentence-by-sentence review returns `authorship_review_required`; a known hard failure returns `rewrite_required`; only complete passing review returns `authorship_pass`.

The V7 attestations belong to the Codex editorial writer. They do not represent owner approval or Terra judgment.

## Feedback ingestion

The feedback command accepts rejection, directional approval, preferred-version, exact-wording, calibration-only, and governed-promotion categories. Exact approval requires an explicit confirmation switch. The writer command cannot perform governed promotion. Default behavior is dry-run with a human-inspectable proposed record.

## Writer evaluation

`sky-placement-writer-evaluation-v1.json` defines a blinded A/B/C owner-preference experiment. It measures editing burden and owner preference separately from judge score. Paid comparisons remain unauthorized. The current owner corpus has already been exposed to the workflow, so a clean same-surface holdout requires future owner work frozen before prompt exposure.

## V7 review candidates

The new local writer pass covers only Saturn in Capricorn, Neptune in Libra, and Uranus in Pisces. Mars in Capricorn, Venus in Aries, and calibration-only Uranus in Cancer are untouched.

V7 is a review bundle only. Every candidate remains `needs_review`, `ownerApproved: false`, `promotionAuthorized: false`, and `canonical: false`.

## Commands

```sh
cd packages/astro-knowledge
npm run build:marie-writer-index
npm run check:marie-writer-index
npm run test:marie-writer
npm run packet:marie-writer -- --planet saturn --sign capricorn --beat hook
npm run audit:marie-authorship -- --candidate-file review/sky-placement-voice-pass-v7-writer-candidates.json --candidate-id sky-placement-v7-saturn-capricorn
```

No billed calls, model-registry mutations, governed-content changes, approvals, promotions, or commits were made as part of this implementation review.
