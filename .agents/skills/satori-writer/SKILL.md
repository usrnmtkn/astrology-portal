---
name: satori-writer
description: Write, rewrite, refine, compare, or prepare approval candidates for TLDR Astro reader copy using ranked Marie Satori owner evidence, the required aspect warmth harvest, structured before/after corrections, deterministic lint, and an authorship rewrite gate before the Terra judge. Use for Sky Placement and aspect editorial work, whenever Codex is asked to make astrology copy sound more like Marie, assess whether wording is authored rather than merely compliant, or record owner feedback without inferring approval.
---

# Satori Writer

Produce authored candidate wording from governed evidence. Treat writing, judging, approval, and promotion as separate jobs.

## Non-negotiable boundaries

- Keep every new or revised unit `needs_review`, `ownerApproved: false`, `promotionAuthorized: false`, and noncanonical unless the owner explicitly approves the complete exact wording.
- Never infer exact approval from “better,” “good,” “great,” a preferred line, or a judge score.
- Never use unapproved AI candidates as positive voice evidence.
- Never use Uranus-in-Cancer v3 as writer/generation evidence; its exact approval is calibration-only.
- Never use CC, SD, or AC prose, dates, or doctrine as Marie Satori voice evidence. Chani-adjacent warmth, tenderness, permission, emotional intelligence, or moderate lyrical cadence is not a failure by itself; documented adjacent-voice constructions and unsupported thematic drift remain out.
- Keep computed dates, degrees, motion, houses, and other moving facts outside prose. Use the checked-in astrology boundary only.
- Require explicit authorization before any billed generation or judge call.
- Do not promote content, alter the editorial model registry, or synchronize external content from this skill.
- Do not write or revise an aspect entry whose human-moment beat is missing. Flag it for editorial work instead of inventing a core. A harvest with `harvest_mode: none_found` is non-blocking; proceed without inventing a reassurance line.

Read [governance.md](references/governance.md) when approval scope, evidence authority, or feedback classification is involved. Read [writer-contract.md](references/writer-contract.md) before drafting or rewriting. Read [commands.md](references/commands.md) when running the deterministic tools.

## Writing workflow

### 1. Establish the target

Identify the surface, planet, sign, article beat, editorial goal, known failure tags, current candidate path, and review state. For Sky Placement, read:

- `packages/astro-knowledge/voice/tldr-astro/sky-placement.json`
- the exact placement meaning source under `packages/astro-knowledge/data/placements/sign/`
- the current candidate record

Do not draft when the fact boundary is missing or ambiguous.

### 2. Compile the minimal first-call packet

Run `scripts/compile-writing-packet.js` with the exact task. Use its JSON and Markdown outputs as the complete first-call writing context.

Require the packet to contain:

- verified astrology;
- surface requirements;
- the exact writing task;
- four to six exact owner-authored passages selected by same-sign, same-planet, then adjacent affinity;
- the concise governed writer prompt.

For a beat-only rewrite, the passages must come from at least three articles, contain at least three paragraph structures, and include at least two passages matching the requested beat. Reject a packet if anything other than `owner_authored_final` appears in initial writer retrieval.

For any aspect surface, also run `packages/astro-knowledge/scripts/build-aspect-writing-packet.js` before drafting. When the harvest finds a qualifying match, the packet records `harvest_mode: matched` and contains one to three OWNER FOUNDATION LINES selected through `packages/astro-knowledge/docs/editorial-ai/method-corpus-warmth-harvest.md`. Current Sky may use direct address or third-person observation as the writing needs, but never narrator commentary or a fourth-wall break. Natal, transit-to-natal, and synastry aspect surfaces retain the owner's second person. A missing human-moment beat fails closed. A corpus miss records `harvest_mode: none_found` and proceeds without a warmth beat.

For a full aspect card, adapt at most one foundation line into one warmth sentence after the shadow or cost, as the final or penultimate sentence. For TLDR lines and short previews, require `harvest_mode: vocabulary_only` and do not add a warmth beat. When a foundation line is used, record `warmthSource` and label the candidate `owner-corpus-derived`; this evidence metadata never changes approval status.

For a complete five-slot article, use `requestedBeat: full_article` and a separate `emphasisBeat`. Select six diverse owner-authored passages for sentence register and paragraph movement: at least three source articles, at least three paragraph structures, no more than two passages from one article, and at least two passages matching the emphasis beat. Do not require an owner article about the exact placement, a prewritten owner scenario, or two complete Current Sky examples.

The astrology library supplies the meaning boundary. The verified astrology block must establish planet function, sign expression, combined meaning, timing, supported domains, unsupported-domain warnings, and source passages. The writer may create original lived moments by combining the governed planet and sign meanings. The transit remains the subject; no single invented scenario may carry the whole card. The moments may be invented; the astrology may not.

For every reader-copy surface, run the local owner-corpus warmth harvest in `packages/astro-knowledge/docs/editorial-ai/method-corpus-warmth-harvest.md`. Name the emotional core, search the owner corpus and VB-005 phrase inventory, and use at most one qualifying feeling or permission line. Prefer pronoun-free evidence, reject ban collisions, and record the exact owner source ID and path. When no qualifying line exists, compile with `harvest_mode: none_found`, attach a non-blocking editorial flag, and do not invent permission or reassurance. Frequent words and phrases are evidence of register, not quotas. Missing warmth evidence never blocks a packet.

Retrieve owner-authored passages that support Marie's recurring attention to technology, power, gatekeeping, being underestimated or pushed down, access, recognition, work, money, status, control, exclusion, invisible labor, limiting roles, and who sets the terms. Use those concerns only where they overlap the governed astrology. Do not force work, money, technology, or power into a placement that does not support them.

Do not treat collective astrology as an automatic instruction to write about campaigns, denied services, public complaints, organizing, policy reform, advocacy, social movements, collective healing, community care, or systemic harm. These subjects require direct support from both the astrology boundary and eligible owner material. Collective may instead describe a platform controlling access, technology changing work or communication, a hierarchy losing power, recognition moving around a gatekeeper, a group refusing a limiting role, or outdated authority losing control.

Do not include current or previous AI candidates, assistant rewrites, contrastive rejected text, negative examples, failure tags, source-selection explanations, ranking, judge reports, calibration results, central-contradiction metadata, or governance reports. The original text being revised may appear only as the explicit task input.

### 3. Route the unpromoted writer candidate fail closed

The initial writer lane is `writer:sky-placement`, model `gpt-5.6-sol`, reasoning effort `xhigh`, and remains an unpromoted candidate. Reject a run if requested and actual lane, model, or reasoning effort differ. Record the prompt version, packet version, and six retrieved owner-source IDs on every accepted artifact.

### 4. Write once from the minimal packet

Follow [writer-contract.md](references/writer-contract.md), but do not inject its analysis into the first writing call. Send only the compiled model input and request one complete final candidate. Do not request options, analysis, a source map, or style explanation.

Permanent distinction: “Chani-adjacent cadence is acceptable. Advocacy-default subject matter is not. Marie Satori voice is defined by the owner's writing, especially her attention to technology, power, gatekeeping, recognition, work, money, exclusion, and being pushed down.” Chani can influence the softness of the delivery; Marie determines what the article notices.

### 5. Run audits after drafting

Only after the draft returns, run deterministic astrology, Sky Page address, fourth-wall, and surface checks. Record the findings without passing them back into the writer call.

For a controlled writer sample, return the Sol draft unchanged even when a check finds a problem. Do not automatically rewrite it, weaken a rule to pass it, or redesign retrieval because of one sentence.

### 6. Use Terra only at the end

After the deterministic checks, use the active Terra-low Sky Placement judge once only when the owner has explicitly authorized the billed call.

Treat score 3 as acceptability evidence, not proof of the strongest possible writing. Do not rewrite a strong article merely because Terra names a minor weakest line. Do not let Terra generate replacement prose.

### 7. Return an owner-review candidate

Return:

- complete article wording;
- routing artifact metadata;
- deterministic astrology, pronoun, and surface results;
- Terra result only when authorized;
- unchanged governance fields.

Do not expose rough brainstorming unless requested.

## Record owner feedback

Use `scripts/record-owner-feedback.js` in dry-run mode first. Classify feedback as rejection, directional approval, preferred version, exact wording approval, calibration-only approval, or governed-content promotion approval.

Require an explicit “I explicitly approve” owner statement before recording exact approval. Refuse governed promotion in this workflow and route it through the content approval/import path.

Show the proposed structured record and file diff before applying it. Rebuild and check the governed voice index after an approved evidence update.

## Writer evaluation

Use `packages/astro-knowledge/config/sky-placement-writer-evaluation-v1.json`. Measure blinded owner preference and editing burden, not Terra scores alone. Do not run paid comparisons until the owner reviews the fixtures, anonymous report, and call budget.
