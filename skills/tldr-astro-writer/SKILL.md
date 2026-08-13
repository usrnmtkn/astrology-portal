---
name: tldr-astro-writer
description: Canonical TLDR Astro drafting, surgical revision, review, and deterministic validation pipeline.
---

# TLDR Astro writer

Use this skill for every astrology-writing task in this repository.

Before drafting or editing, read these files completely:

1. `../../docs/writing/ASTROLOGY_CONTRACT.md`
2. `../../docs/writing/VOICE_CONTRACT.md`
3. `../../docs/writing/LITERAL_LANGUAGE_RULES.md`
4. `../../docs/writing/BANNED_PATTERNS.md`
5. `../../docs/writing/REVIEW_RUBRIC.md`
6. `../../docs/writing/OWNER_CORRECTIONS.md`
7. `../../tldr-astro-phrasebank/TLDR-AUTHOR-FROM-MECHANISM-RULING-OWNER.md`

Use `../../src/astro-writing/runWritingPipeline.mjs` for generated prose. Its order is binding:

1. prepare the governed row key, `AstrologySupport`, and source constraints while withholding all prior prose;
2. build the astrology meaning plan from that source;
3. retrieve a small owner-approved context set, excluding the current row;
4. draft fresh from the governed mechanism and a lived human situation;
5. run the separate Marie review, using prior prose only as downstream paraphrase evidence;
6. revise only failed fields and review again;
7. run deterministic validation.

Never infer owner approval. Generated or refined prose remains `needs_review`, `ownerApproved: false`, `promotionAuthorized: false`, and `canonical: false` until the owner explicitly approves the exact wording.

Never make a billed model call without explicit authorization for that call or batch.
