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

Use `../../src/astro-writing/runWritingPipeline.mjs` for generated prose. Its order is binding:

1. build the astrology meaning plan;
2. retrieve a small owner-approved context set;
3. draft from governed astrology;
4. run the separate Marie review;
5. revise only failed fields and review again;
6. run deterministic validation.

Never infer owner approval. Generated or refined prose remains `needs_review`, `ownerApproved: false`, `promotionAuthorized: false`, and `canonical: false` until the owner explicitly approves the exact wording.

Never make a billed model call without explicit authorization for that call or batch.
