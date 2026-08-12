# Friend natal candidates: owner review verdict (round 1)

Date: 2026-08-11. Owner reviewed all 43 candidate items against COMPOSED output, per the ruling's composition-level QA requirement.

## Verdict

- 41 of 43 flagged. Only #9 `planet-function/moon` and #11 `planet-function/venus` read cleanly as composed.
- The flagged workbook with per-row verdicts and edits exists in the owner's external review environment and must be imported into the repo before candidate wording changes state. Until then, ALL 43 candidates remain `needs_review`; the two clean rows are NOT approved in isolation.

## Owner findings (verbatim summary)

1. **Chiron family (#17-26) fails friend voice as composed**: the compositions still coach an absent friend ("a good next step," "one useful rep," "the experiment," "the assignment," "the prescription," "the move") even where individual vocabulary slots are grammatical. Also translation-required language: "old sore spot," "tender spot asks for," "personal file," "vault," "helper seat by the door," "missing credential is their own signature."
2. **House/ruler compositions (#1-5) have a structural defect, not a word-choice defect**: renders like "solitude, the unconscious, and the behind-the-scenes respond best to speed and directness" are not natural English, and generic Aries sign-material is injected into houses where it does not belong. The composition/template itself is the problem.
3. **Translation-required sentences across the set** (owner examples): "They move late and heavy." / "They act in full view and put their name on the swing." / "Service is not small to them; it is the point." / "Friends collect around them." / "They build safety by hand." / "Their timing often runs ahead of the world." / "Belonging is all or nothing for them." / "Their imagination people can feel from across the room." / "An opposition puts two parts of their nature at opposite ends of the same issue, and those parts tend to take turns."
4. **Composition/grammar defects**: "stability and comfort is what expands them" (agreement), "{{houseTopic}} become clearer" (agreement with slot), and the Mercury/Aries surrounding frame still reading "their mind runs boldly, fast, and head-on; what it hunts for is to act and lead" even though the new Mercury/Aries candidate sentence is strong.

## Owner conclusion (ruling for pass 2)

Vocabulary variants alone are not enough. The next pass must REWRITE THE SHARED FRIEND FRAMES themselves and QA the fully composed result, prioritizing the Chiron, house-ruler, planet-intro, and planet-by-sign skeletons.

## Architectural note for pass 2 (implementation recommendation, not owner prose)

Precedent for authored-over-assembled copy, with exact artifacts:

1. CC narrative-derived voiced copy replaced by the source-safe owner-voice rewrite: `tldr-astro-phrasebank/tldr-astro-cc-knowledge-matrix-owner-voice-audited-v5.xlsx` (2,454 cells regenerated from structured keys; owner-approved 2026-08-09), superseding the narrative-derived layer recorded in `tldr-astro-cc-knowledge-matrix-voiced.xlsx` Coverage.
2. LL formulaic copy replaced by the direct-language authored edition: `tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx` (195 changes owner-approved 2026-08-10; V12-to-V13 diff on its ClarityStrictV13 sheet).
3. Friend natal frame+slot composition: 41 of 43 candidates flagged by the owner in this round-1 review against composed output (`packages/astro-knowledge/review/friend-natal-voice-audit-v1.json`, this record).

Two paths per family, using exact source-row identifiers from `fallback-source-rows-v3.json`:

- **Authored rows where approved copy exists**: the LL V13 owner-approved matrix contains authored self-voice planet-in-sign and planet-in-house delineations keyed `planet|sign` and `planet|Nth house`. For the hookRow families `fallback-hook/placement-sentence/*` and `fallback-hook/placement-house-sentence/*`, derive authored friend-voice variants from the approved V13 rows under `TLDR-FRIEND-NATAL-VOICE-RULING-OWNER.md`, replacing frame+slot composition for those passages.
- **Frame rewrite where no authored base exists**: `fallback-hook/planet-intro/*`, `fallback-hook/angle-intro`, `fallback-hook/angle-sign/*`, `fallback-hook/aspect-type/*`, `fallback-hook/aspect-pair/*`, `fallback-hook/house-cusp/*`, `fallback-hook/ruler-method/*`, empty-house frames, and glossary frames are rewritten as frames, with slot grammar contracts (number agreement for plural house-topic slots, verb selection per slot type) and composed-output QA. Chiron `fallback-vocab/placement-gerund/chiron/*` requires a fresh register (observation, not coaching) rather than slot repair.
- The `fallback-hook/ruler-method/*` template pattern "[houseTopic list] respond(s) best to [sign manner]" should be retired, not repaired: it forces abstract house-noun lists into subject position, which no rewrite can make natural, and it injects sign-manner material across houses where it does not belong.
- `element-pattern/*` remains AMBIGUOUS PERSON CONTRACT and is untouched by pass 2 until the owner fills the corresponding OwnerDecisions ruling.

## Import acceptance requirements (added after governance review, 2026-08-11)

- The populated owner-verdict workbook (Candidates43!I2:J44 and OwnerDecisions!D2:D4 filled) must be imported before any candidate changes state.
- Import acceptance requires a rendered composed sample or a stable render key/hash for all 43 rows. Eleven audit items currently lack `renderedComposedSample` (#7-11, #13-16, #37, #41 — including the two rows the owner passed, #9 and #11). Codex must regenerate samples for those rows (or record their stable render keys and hashes) before the owner's clean verdicts on #9 and #11 can be accepted as verdicts on composed output.

## Status

No candidate approved. No serving change. Pass 2 requires owner-imported verdicts plus owner authorization of the frame-rewrite scope.
