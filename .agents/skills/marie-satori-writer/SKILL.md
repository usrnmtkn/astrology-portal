---
name: marie-satori-writer
description: Write, rewrite, refine, compare, or prepare approval candidates for TLDR Astro reader copy using ranked Marie Satori owner evidence, structured before/after corrections, deterministic lint, and an authorship rewrite gate before the Terra judge. Use for Sky Placement editorial work and whenever Codex is asked to make astrology copy sound more like Marie, assess whether wording is authored rather than merely compliant, or record owner feedback without inferring approval.
---

# Marie Satori Writer

Produce authored candidate wording from governed evidence. Treat writing, judging, approval, and promotion as separate jobs.

## Non-negotiable boundaries

- Keep every new or revised unit `needs_review`, `ownerApproved: false`, `promotionAuthorized: false`, and noncanonical unless the owner explicitly approves the complete exact wording.
- Never infer exact approval from “better,” “good,” “great,” a preferred line, or a judge score.
- Never use unapproved AI candidates as positive voice evidence.
- Never use Uranus-in-Cancer v3 as writer/generation evidence; its exact approval is calibration-only.
- Never use CC, SD, or AC phrasing, cadence, metaphors, dates, or doctrine as Marie Satori voice evidence.
- Keep computed dates, degrees, motion, houses, and other moving facts outside prose. Use the checked-in astrology boundary only.
- Require explicit authorization before any billed generation or judge call.
- Do not promote content, alter the editorial model registry, or synchronize external content from this skill.

Read [governance.md](references/governance.md) when approval scope, evidence authority, or feedback classification is involved. Read [writer-contract.md](references/writer-contract.md) before drafting or rewriting. Read [commands.md](references/commands.md) when running the deterministic tools.

## Writing workflow

### 1. Establish the target

Identify the surface, planet, sign, article beat, editorial goal, known failure tags, current candidate path, and review state. For Sky Placement, read:

- `packages/astro-knowledge/voice/tldr-astro/sky-placement.json`
- the exact placement meaning source under `packages/astro-knowledge/data/placements/sign/`
- the current candidate record

Do not draft when the fact boundary is missing or ambiguous.

### 2. Compile the evidence packet

Run `scripts/compile-writing-packet.js` with the target and current candidate. Use its JSON and Markdown outputs as the complete writing context.

Require the packet to contain:

- the surface contract and astrology boundary;
- three to five positive owner-authored excerpts;
- two to four relevant contrastive owner edits;
- one or two relevant failures;
- the current candidate and governance state;
- a selection reason and provenance for every excerpt.

Reject a packet if an `ai_candidate_unreviewed`, `owner_rejected`, `historical_only`, or `third_party_source` record appears as positive evidence.

### 3. Find one article spine

Before writing, state privately:

- the central lived pressure;
- the behavior that proves it;
- the choice made under pressure;
- the consequence;
- the contradiction the turn reveals.

Build one sequence. Do not line up representative examples from several life domains.

### 4. Draft and rewrite as the writer

Follow [writer-contract.md](references/writer-contract.md). Draft the complete article privately, even when the reported defect is one sentence. Preserve genuinely strong lines and facts, but do not preserve weak architecture merely because the judge named only one line.

Write three private hook options. Reject definitions, slogans, atmosphere, abstract summaries, and polished shorthand. Choose the hook with the clearest lived pressure.

Perform a sentence-by-sentence rewrite before showing the candidate. Replace every sentence that:

- summarizes instead of showing;
- makes an abstraction act like a person;
- needs interpretation to become concrete;
- could move to another placement;
- inventories categories;
- repeats an established beat;
- explains what the scene already proves;
- turns a move into administration;
- adds a second conclusion;
- sounds like a competent content writer imitating Marie.

### 5. Run deterministic gates

Run the existing Sky Placement linter and `scripts/audit-authorship.js`.

The authorship audit intentionally returns `authorship_review_required` until semantic checks cover every sentence and every article-level question. Complete that review in the current task, rewrite failures, and rerun. A warning-only handoff is not a completed writing pass.

Do not weaken a linter or authorship rule to pass a candidate.

### 6. Use Terra only at the end

After facts, retrieval, drafting, line editing, lint, and authorship audit pass, use the active Terra-low Sky Placement judge once only when the owner has explicitly authorized the billed call.

Treat score 3 as acceptability evidence, not proof of the strongest possible writing. Do not rewrite a strong article merely because Terra names a minor weakest line. Do not let Terra generate replacement prose.

### 7. Return an owner-review candidate

Return:

- complete article wording;
- central sequence;
- substantive change list;
- positive and contrastive evidence used;
- intentionally preserved lines and why;
- lint and authorship results;
- Terra result only when authorized;
- unchanged governance fields.

Do not expose rough brainstorming unless requested.

## Record owner feedback

Use `scripts/record-owner-feedback.js` in dry-run mode first. Classify feedback as rejection, directional approval, preferred version, exact wording approval, calibration-only approval, or governed-content promotion approval.

Require an explicit “I explicitly approve” owner statement before recording exact approval. Refuse governed promotion in this workflow and route it through the content approval/import path.

Show the proposed structured record and file diff before applying it. Rebuild and check the governed voice index after an approved evidence update.

## Writer evaluation

Use `packages/astro-knowledge/config/sky-placement-writer-evaluation-v1.json`. Measure blinded owner preference and editing burden, not Terra scores alone. Do not run paid comparisons until the owner reviews the fixtures, anonymous report, and call budget.
