# Natal placement direct-chat authoring owner ruling

Date: 2026-08-31
Scope: natal planet-placement repair on `agent/natal-placement-three-layer-audit`
Status: owner process direction; does not approve any replacement prose by itself

## Owner direction

The owner directed that the natal placement repair continue through direct ChatGPT review and authoring rather than requiring Codex / `runWritingPipeline.mjs` to generate the reader-facing candidates. The owner specifically identified the Codex writing engine as insufficiently robust for this work because it produces flat prose, and noted that prior TLDR Astro work has been successfully authored directly in ChatGPT.

For this task, direct ChatGPT authoring is therefore the selected writing path.

## What remains governed

This process change does not weaken the editorial or serving gates:

- semantic meaning must remain grounded in the supplied natal sources, including Myrna Lofthus, *A Spiritual Approach to Astrology*, for planet-in-house meaning;
- owner-authored Chiron and Lilith material remains positive structural evidence for developed natal placement writing;
- current owner writing standards, correction ledger, do-not-use rules, sign/house separation, literal-language rules, and cold rendered prose review still apply;
- ChatGPT must retrieve and use owner-authored prose evidence before drafting rather than writing from astrology notes alone;
- existing protected `approved` copy remains byte-identical unless the owner approves the exact replacement wording;
- new ChatGPT-authored replacement candidates remain `needs_review`, `ownerApproved: false`, `promotionAuthorized: false`, and `canonical: false` until the owner approves their complete exact wording;
- no candidate is promoted or served merely because ChatGPT recommends it.

## Placement architecture

The three-layer natal placement hierarchy remains binding:

1. Sign baseline: complete birth-time-independent planet-in-sign interpretation.
2. Planet-house baseline: complete interpretation of that specific planet operating in that natal house, valid across signs.
3. Exact synthesis: custom planet-in-sign-in-house interpretation that adds information neither baseline supplies independently.

Direct ChatGPT authoring changes the prose-generation method, not the architecture, astrology boundaries, provenance, or owner approval wall.
