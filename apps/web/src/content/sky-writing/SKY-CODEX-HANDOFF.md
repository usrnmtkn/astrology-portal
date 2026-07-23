# Sky Writing V1 — Codex Handoff

## Files
- sign-colors-v1.json and house-transits-master-v2.json — included for completeness; byte-identical to the packages already imported for the house surface. If the repo copies match, no action; if they differ, these win.
- fallback-atoms-v1.json — planetFunctions(10), signMechanics(12), doDont(18: "planet.direct"/"planet.retrograde"), collectiveFrames(10), signSubjects(12)
- sky-articles-authored-v1.json — the COMPLETE authored evergreen library: 216 units, an article for every planet-sign placement (120 direct, keys sky.<planet>.<sign>) and every retrograde-in-sign (96 guides, keys sky.<planet>.<sign>.rx). The Mercury-in-Cancer pair is author-locked; all other units are author-final-draft and may receive line edits in future re-imports. Every placement page renders an authored article; the composed fallback remains implemented as the safety tier but should never serve in practice.
- TLDR-Sky-Article-Spec.md — structure, tiers, assembly order, computed slots, retired elements. It is the contract for this surface.

## Rules
1. Tier precedence per placement: bespoke cycle piece > authored article > composed fallback. Never render the old V3 sky copy again.
2. Authored article sections render in schema order; computed aspect beats inject INTO the walkthrough chronologically, alongside walkthrough_authored_beats, all in the narrated format. No "for everyone at once."
3. Fallback assembles per the spec's order from atoms only. Missing atom = omit that block, never synthesize. All text is display-final: no truncation, no derivation, no edits.
4. Rx pages must serve rx content (article or fallback with doDont["planet.retrograde"]); never render direct copy under a retrograde header. Header date slots (rx range, shadows, cazimi) are computed.
5. Per CONTENT-CONTRACT.md R4/R5: these packages supersede draft sky copy; readerSafety stays sanitize-only; adapter exposes these units; contract test must pass with unchanged shasum.

## Acceptance
- node scripts/test-content-contract.mjs → PASSED; test shasum unchanged (cc2cb4f48416761d7f25daf8240d599a4c45630f)
- /#sky/placement/mercury/cancer renders the authored direct article (and the Rx guide during a Mercury Rx window), with dated beats narrated inline
- Any other placement (e.g., mars/gemini) renders the composed fallback in the spec's assembly order, ending with its Do/Don't and handoff line
- No adjective-triplet openers, no "for everyone at once," no kumbaya closers anywhere on the Sky surface
