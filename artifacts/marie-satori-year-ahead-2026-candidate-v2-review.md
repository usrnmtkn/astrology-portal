# Marie Satori Year Ahead candidate v2: editorial review record

Status: `needs_review` for every unit. This record does not grant exact-wording approval, canonical status, or promotion authorization.

## Pipeline record

- Source: `artifacts/marie-satori-year-ahead-2026.md` (unchanged)
- Candidate: `artifacts/marie-satori-year-ahead-2026-candidate-v2.md`
- Source SHA-256: `6b4061f5b00bc980b0035bb0b87161791a962acf93bd08549a4eeda8b1c59c64`
- Candidate SHA-256: `2f98ae57ca6767f9747667456f34818cb9fb7f2d7bf9ec5e9232c71c94ff4a5d`
- Calls: 11 writer calls on `writer:sky-placement` (OpenAI `gpt-5.6-sol`, xhigh) and 11 judge calls on `judge:sky-placement` (OpenAI `gpt-5.6-terra`, low). Total: 22. No retries.
- Packet method: manual nearest-surface adaptation for all 11 units. The deterministic compiler requires a single Sky Placement planet/sign and would inject the wrong structural contract for a Year Ahead report chapter. Each manual packet used six active, owner-verified `owner_authored_final` passages and a per-unit owner-corpus warmth harvest of `matched` or `none_found`.
- Judge: `packages/astro-knowledge/scripts/judge-article-voice.js`, the closest applicable judge. Its rubric expects full long-form Sky article devices, so its scores are acceptability evidence only and are not approval decisions.

## Deterministic checks and judge results

“Clean” means no banned word or phrase, em dash, contrast-reveal construction, vague placeholder, moralizing closer, stacked imperative finding, or reader-safety failure. Fact lock also passed: all locked attribution/date/category strings remain exact; no original factual value is missing; no novel date, degree, or house value was added; the colophon is unchanged.

| Unit | Status | Deterministic lint | Judge | Judge findings |
| --- | --- | --- | --- | --- |
| Cover | needs_review | Clean; fact lock passed | 1, off-voice | empathy-first; maybe-lists; teaching-correction; benediction-close |
| Solar-return moment | needs_review | Clean; fact lock passed | 1, off-voice | empathy-first; direct-lived-register; maybe-lists; teaching-correction; benediction-close |
| How big | needs_review | Clean; fact lock passed | 1, off-voice | direct-lived-register; maybe-lists; teaching-correction; benediction-close |
| Stance | needs_review | Clean; fact lock passed | 2, borderline | direct-lived-register; maybe-lists |
| Where the light falls | needs_review | **Lint failure (corrected finding): contains banned "whether" ("whether recognition is helping…"). The original "Clean" result was wrong.** Fact lock passed | 2, borderline | maybe-lists; benediction-close |
| This winter | needs_review | Clean; fact lock passed | 2, borderline | maybe-lists |
| Spring | needs_review | Clean; fact lock passed | 2, borderline | maybe-lists |
| Summer | needs_review | Clean; fact lock passed | 3, in-voice | None |
| Autumn | needs_review | Clean; fact lock passed | 2, borderline | maybe-lists |
| Next winter | needs_review | Clean; fact lock passed | 2, borderline | maybe-lists; teaching-correction |
| Looking ahead | needs_review | Clean; fact lock passed | 2, borderline | maybe-lists |

## Editorial observations for owner review

- The cover writer preserved the prototype note saying the copy had not yet been through the Marie Satori packet or Terra judge. That statement is now stale. It was left untouched after the single writer pass so the judged cover text and candidate text remain identical. Its replacement wording requires owner review. **Owner decision (v3): the note is removed from reader-facing copy; calculation/status information belongs in development metadata, not the report.**
- **Owner correction: the repeated `maybe-lists` finding must not be treated as an instruction to manufacture more scene-runs.** This is a Year Ahead report; chronology and concrete stakes are sufficient specificity. Invented anecdotes would make the copy less like the owner. The finding reflects the Sky long-form rubric's mismatch with this format, especially on short structural units (cover, solar-return moment).
- **Owner correction to diagnosis: the weakness is "bridge prose needs more lived language," not "needs more lived scene-runs."** The weak spots are connector sentences (keyword stacks, textbook astrology, vague transitions), not the thesis sentences, which are largely sound.
- A passing Summer score is acceptability evidence only. It is not exact-wording approval. **Per governance, judge scores cannot grant owner approval; they remain evidence in every case, including Summer's.**

## Owner-issued writing rule for Year Ahead reports (for Codex)

For Year Ahead reports, do not manufacture scene-runs to satisfy a long-form judge. Build specificity through chronology, concrete stakes, and cause-and-consequence. When a paragraph feels off-voice, inspect the bridge sentences first. Remove keyword stacks, textbook astrology, vague connector language, and explanations that merely restate a stronger lived sentence. Preserve the strong thesis and refine the bridge.

## Candidate v3 (owner-directed editorial pass applied)

- Candidate: `artifacts/marie-satori-year-ahead-2026-candidate-v3.md`
- Candidate v3 SHA-256: `61dddcb95cd15ca81bfd4512a1d6b1f460eb237dc90121545084c185c5f8cf31`
- Method: owner-directed unit revisions and key-date edits applied; exact wording remains pending owner approval. Facts, dates, aspects, italic attribution strings, key-date architecture, and colophon unchanged. Stale prototype note removed from reader-facing copy. Cover uses the owner's metaphor variant ("protect your time for the work that needs quiet"), consistent with the owner's removal of the studio metaphor in Stance, Autumn, and Next winter; flip to the literal variant if the studio is a physical place.
- Deterministic re-check on v3: no banned "whether", no em dashes.
- Status: all units remain `needs_review` pending the owner's exact-wording approval. This record still grants no approval or promotion authority.

## Candidate v4 (owner-directed editorial pass applied)

- Candidate: `artifacts/marie-satori-year-ahead-2026-candidate-v4.md`
- Method: owner v3 review applied under the owner's stop rule (edit only for a specific failure in astrology, logic, specificity, grammar, natural language, or repetition). Changes, all owner-directed:
  - Solar-return moment: corrected the birthday/return logic (the return, not the calendar birthday, begins the chart; owner's preferred three-sentence version).
  - How big: replaced "operate work more easily with" and the "sharper focus" keyword stack with the owner's lived versions.
  - Where the light falls: removed the duplicated house-keyword sentence and the unanchored "By June" claim; astrology anchor now carries the repetition (owner's restructure).
  - This winter: "friends or family" corrected to "at home or with family" after verifying natal Saturn sits in the whole-sign 4th (Virgo from Gemini rising); "friends" was bleed from the FRIENDS & FAMILY category tag. Mar 3 key date aligned ("family or household responsibility"); category tag unchanged, as the taxonomy has no HOME category.
  - Spring: removed the "identity, recognition, and independence" keyword stack and the reader-diagnosing sentence; owner's replacements applied. May 19 key date: vague "part" replaced with "practice or limit."
  - Summer: Sep 15 title renamed "New terms for home and work."
  - Autumn: Sep 27 Jupiter-sextile-Pluto omission resolved by widening the opening window ("Late September and early October") and naming both aspects in the existing sentence; the two transits support the same building beat, so no new paragraph was added.
  - Next winter: "eleven days" factual error corrected to the owner's "less than a week" (events span Feb 5-10, six days inclusive); eclipse paragraph and Feb 6 key date replaced with the owner's lived versions.
  - Looking ahead: "finished carrying" replaced with the owner's "obligations have run their course"; Midheaven eclipse claim softened to the owner's "may create a clearer opening" version.
- Owner assessment carried on record: Summer, Autumn, and most of Stance are near-final. The optional Stance bridge sentence ("something finished to carry into public view") was retained at the owner's discretion as having more voice.
- Deterministic re-check on v4: no em dashes; no banned words or phrases; fact lock passed (no date, degree, aspect, house, or attribution value altered except the two owner-directed factual corrections above, both of which move the text toward the computed facts).
- Status: all units remain `needs_review` pending the owner's exact-wording approval. This record grants no approval or promotion authority.

## Candidate v5 (owner-directed editorial pass applied)

- Candidate: `artifacts/marie-satori-year-ahead-2026-candidate-v5.md`
- Candidate v5 SHA-256: `a8f8a71572b34b2c15609ee9d7eab00e587ed23a7595f71b0d1862fc615ab8ca`
- Method: exactly four owner-directed sentence edits applied to v4; nothing else touched. (1) How big: "governs the year by age" replaced with "governs your profection year". (2) Spring: the mixed-verb list sentence replaced with the owner's "This is the first of three Saturn passes. The question is practical: what still works once it has to fit a real week?" (3) Sep 15 key date: "what time" corrected to "how much time". (4) Next winter: "May's first attempt and October's review" replaced with "the first pass in May and the review in October".
- Editor flag for owner decision, not edited: the applied Spring wording now reads "…Saturn makes the first of three sextiles to your Ascendant. This is the first of three Saturn passes." The second sentence restates the first in plain language. If unintended, dropping "This is the first of three Saturn passes." resolves it; left verbatim per the stop rule.
- Report-period convention, computed facts for owner decision: the interpreted Solar Return window is Feb 17, 2026 8:59 PM EST through the next return on Feb 18, 2027 2:40 AM EST. The header currently displays birthday-to-birthday (Feb 18, 2026 - Feb 17, 2027). Options: (a) exact-return convention, header "Feb 17, 2026 - Feb 18, 2027", matching the chart the copy now teaches; (b) keep the birthday convention for readability and document it in `docs/return-reports-implementation-plan.md` §4 as the display rule. No key date falls on the boundary days, so either choice moves no content.
- Deterministic re-check on v5: no em dashes; word-level diff against v4 confirms only the four edits.
- Status: all units remain `needs_review` pending the owner's exact-wording approval. This record grants no approval or promotion authority.

## Candidate v6 (owner-directed editorial pass applied)

- Candidate: `artifacts/marie-satori-year-ahead-2026-candidate-v6.md`
- Candidate v6 SHA-256: `900518f69005268d892520e5956b2e3745e180ca4555ff24536b52039256c12a`
- Method: exactly two owner-directed sentence edits applied to v5. (1) Spring opener: "harder to keep" corrected to "harder to stay in" (owner's preferred variant). (2) Next winter: "need to agree" corrected to "need in order to agree" (required natural-language correction). Word-level diff against v5 confirms only these edits.
- Date convention resolved and documented: display period is birthday-to-birthday; interpretation runs on the exact solar-return window. Recorded as calculation decision §3.6 in `docs/return-reports-implementation-plan.md` with the instruction that generators must not reconcile the two sides. Header dates in this candidate are therefore correct as displayed.
- The v5 Spring redundancy flag ("This is the first of three Saturn passes.") stands as owner-accepted wording per the owner's "everything else should stay."
- Status: all units remain `needs_review`. Per the owner, this candidate is ready for the exact-wording yes/no read with no further writer or judge passes.

## Candidate v7 (owner-directed editorial pass applied)

- Candidate: `artifacts/marie-satori-year-ahead-2026-candidate-v7.md`
- Candidate v7 SHA-256: `6896c00f0473e0b217e8cbbd53b3843832594c581147e3b4a32e8dd5dd017f97`
- Method: one owner-directed sentence edit applied to v6. Spring opener: "harder to stay in" replaced with "harder to keep playing," connecting to the paragraph's presentation-of-role logic. Word-level diff against v6 confirms this is the only change.
- Date convention: already resolved and documented as calculation decision §3.6 in `docs/return-reports-implementation-plan.md` (display birthday-to-birthday; interpret from the exact return; generators must not reconcile the two). No report edit required.
- Owner-designated calibration sentences recorded for future writer-evidence use, pending the owner's exact-wording approval of the containing units: the Stance "central pressure is practical" line, the Spring access/credit/agreeable question run, the Spring "fit a real week" question, and the Looking Ahead "nobody is waiting for it" line.
- Status: all units remain `needs_review`. This is the exact-wording yes/no candidate; no further writer, judge, or editorial passes.

## Candidates v8 and v9 (owner-directed, produced in the owner's writing session; archived here from owner-supplied text)

- **v8 (chart-layer correction):** the owner caught a factual mislabeling introduced during rewriting: Stance attributed exalted-Pisces Venus to the natal chart, while natal Venus is 14°57' Capricorn. The intended fact belongs to the Solar Return chart. **Computationally verified before acceptance:** Solar Return Venus is 9°35' Pisces (exalted), falling in the natal whole-sign 10th (Pisces from Gemini rising). Stance prose and attribution relabeled to "Solar Return Venus"; no other edits.
- **v9 (accessibility pass):** owner-directed principle: main prose tells the reader what the astrology means; the italic attribution shows the astrology that supports it. Changes limited to jargon-translation in Solar-return moment, How big, Stance, Where the light falls, and the Winter Saturn/Neptune bridge. Dense multi-concept attribution lines simplified (exaltation and Lord-of-Year explanation deferred to a future glossary/tap state rather than taught inline). Seasonal chronology, dates, aspects, key-date lines, and settled prose untouched.
- Archived: `artifacts/marie-satori-year-ahead-2026-candidate-v9-accessibility-pass.md`, SHA-256 `441022c3af5887fc72bc15532edde973e971960656c3540bec5ad6ce13f4a341` (markdown structure reconstructed to house conventions from owner-supplied text; wording verbatim).
- Deterministic re-check on v9: no em dashes, banned lists clean.
- **Product rule recorded for the Year Ahead generators (owner, 2026-08-09):** prose explains meaning in everyday language; the attribution line carries the technical astrology; do not stack more than two technical concepts in one attribution sentence; technical terms needing definition (exalted, Lord of the Year) belong in a glossary/tap state, not inline. One register note for R3/Y4 prompt rules: v9 uses "We use the chart..." in the Solar Return explainer; first-person-plural is otherwise foreign to the app voice and should be a deliberate owner choice before it enters generator prompts.
- Status: all units remain `needs_review`. v9 is the current exact-wording candidate.

## Candidate v10 (manifestation pass, owner exemplars integrated)

- Candidate: `artifacts/marie-satori-year-ahead-2026-candidate-v10-manifestation-pass.md`
- SHA-256: `4da235655c6f01be30b56e2ab05c9aae17626ff15a405d3d854e77b3bf93d6ec`
- Method: applied the owner's manifestation-set ruling (`tldr-astro-phrasebank/TLDR-YEAR-AHEAD-MANIFESTATION-SETS-OWNER.md`) using the owner's own exemplar wordings, which were written for this chart. Changes: How-big opens with the owner's lived-year overview, architecture second; Stance gains the owner's 12th-house lived passage; Winter eclipse gains the 4th-house manifestation menu; Spring gains the Uranus-square-Sun lived version; Summer gains the Jupiter-return menu and the owner's 6th-house-Moon capacity passage (replacing the shorter Jupiter-square-Moon line); Autumn gains "A plan that only works when nothing goes wrong is not finished yet"; Next winter's Midheaven eclipse gains the owner's application/offer/rejection menu (employment-status covering). All facts, dates, attribution lines (verified identical v9→v10), key-date lines, and colophon unchanged. Settled sentences preserved.
- Deterministic re-check: no em dashes; banned lists clean. Note: the owner-authored Summer passage contains "resentment about how much of the day belongs to everyone else" and Spring "may not be willing to give it" — both within ruling exemplars, applied verbatim.
- Status: superseded same-day by the owner-session v10 below.

## Candidate v10 final (owner-session manifestation pass) + sidecar

- Two parallel v10s were produced from the same ruling; the owner-session version went further and is canonical. Archived at the same path, SHA-256 `02f7d8c673ab562a9226c52a5d5579c00a9d636c7f5a026ca5ab39492444cf1b`.
- Sidecar archived: `artifacts/marie-satori-year-ahead-2026-manifestation-sets-v1.md`, the per-factor FACTOR → DOMAIN → MANIFESTATIONS → DO NOT ASSUME → COPY CLAIM records for this chart; seed data for the future `packages/astro-knowledge/data/manifestation-sets` dataset.
- Deterministic re-check: no em dashes; banned lists clean; "sixth-house Moon" and "sixth-house Uranus" verified against the natal chart (both Scorpio, whole-sign 6th from Gemini).
- Density review (Codex, at owner request) delivered in session; findings summarized as proposed density rules pending owner ruling.
- Status: superseded by v11.

## Candidate v11 (owner refinement pass, complete text supplied by owner)

- Candidate: `artifacts/marie-satori-year-ahead-2026-candidate-v11.md`, SHA-256 `f7ea6e1e50b734e26572677ea4cb4abb104925c4f472ccc17e4b5884947d1c96`
- Method: the owner reviewed the manifestation pass and supplied the full revised report. Changes: Winter's declarative manifestations converted to possibility language (the one specificity-ceiling violation, required); How-big paragraph 2 opens on the Venus mechanism directly, "connects decisions about" replacing "puts more weight on"; Stance de-duplicated (private→public conclusion delivered once, after the 12th-house explanation); Spring drops "update your public identity" as abstract-register creep; Summer's Moon anchor reads "sixth house of work, health, and daily routines" (health chart-earned and immediately translated); Autumn's Uranus paragraph sharpened to tool/schedule/work-process; Next winter "negotiate more responsibility"; Looking-ahead February sentence carries the manifestation register. Density verdict recorded: near the upper useful limit; surgical refinement, not more expansion.
- Owner assessment on record: specificity much improved; status neutrality strong; lived usefulness strong; the Midheaven passage ("An application may turn into an offer or rejection. A title may change. A project may finally carry your name.") is designated the canonical example of status-neutral 10th-house/Midheaven writing.
- Deterministic re-check: no em dashes; no declarative manifestations remain; "application" count 3 (within lexical budget).
- Status: superseded by v12.

## Candidate v12 (owner full rewrite under the complete ruleset)

- Candidate: `artifacts/marie-satori-year-ahead-2026-candidate-v12.md`, SHA-256 `6d72cff41ed5142c0f0e55f6aa5bfcb56fc33d2d9106df044dd24dde376b15d3`
- Method: owner-supplied full rewrite applying the manifestation-set and density rules end to end. Structural changes: How-big paragraph 1 is now a seasonal preview of the whole year (March home decision, summer communication, late-August capacity test, February career point); Stance restructured profection-first with the new line "Give unfinished work enough privacy to become finished work"; the fifth-house material consolidated into Where-the-light with the closer "Keep some part of the year for work and pleasure that still matter when nobody is watching"; repeat passes advance rather than re-list (May 19 "establishes the question that returns in October and February"; Feb 5 "You know more now about what worked"); the Midheaven career menu lives only at its February anchor; the Summer capacity material expanded into a hedged scenario block; **the Saturn non-return note removed** — which aligns with the product design (the Saturn-return element is a conditional callout that appears only when a return window fires; a non-return year shows nothing); Looking-ahead ends "The next cycle begins with a better idea of what is worth carrying forward."
- Deterministic re-check: no em dashes; "application" ×4.
- **Validator-rule question flagged for owner:** the Summer scenario block uses declaratives ("Sleep gets shorter. Meals get pushed around.") inside an explicitly hedged frame ("the overload may become visible in the basics first"). This differs from the Winter violation (unhedged standalone menu items). Proposed rule: declarative elaboration is permitted inside a scenario block opened by a hedged frame in the immediately preceding sentence; the validator checks the frame, not each sentence. Owner to confirm.
- Status: superseded by v13.

## Candidate v13 (owner tone rewrite)

- Candidate: `artifacts/marie-satori-year-ahead-2026-candidate-v13-tone-rewrite.md` (owner file `marie-satori-year-ahead-2026-tone-rewrite.md`), SHA-256 `a93786e5de65a8b77cd1f03d46437fcd22a24526fafafdf3793bfe442f8c3d33`
- Method: owner-supplied voice-sharpening pass over v12. Notable: the "We use the chart" first-person plural is resolved ("The chart for that moment shows..."), closing the open register flag; new signature lines ("Not everything you make this year needs a business plan," "Keep one part of the year for what you would still want if nobody applauded," "the issue becomes leverage," "What mattered privately all year now has consequences other people can see," "a clearer idea of what deserves your name"); "The upside is... The trap is..." construction in Where-the-light; Winter prose now names the eclipse's natal 4th house inline (verified: Virgo is whole-sign 4th from Gemini).
- Deterministic re-check: no em dashes; banned lists clean; attribution lines byte-identical v12→v13; "application" ×3; scenario blocks remain hedged-frame declaratives (owner's continued use of the pattern is treated as confirmation of the scenario-block validator rule).
- One density note flagged, not edited: "less unfinished business" closes both Next winter and Looking ahead, two adjacent sections, the report's only remaining repetition.
- Status: superseded by v14.

## Candidate v14 (owner restructure under the consolidated generation logic)

- Candidate: `artifacts/marie-satori-year-ahead-2026-candidate-v14.md`, SHA-256 `4658e156b8583ef0e33c778c9991d7a6eff3160a5ae453b15d3fe00bd7fdd5f6`
- Method: owner-supplied full rewrite to the new standard, assembled with the owner's three same-message refinements applied: the "Your solar return moment" section removed (SR technical line moved to the colophon as metadata); the overview's March sentence upgraded to carry its chart reason (natal Saturn, 4th house, manifestation menu); the central-pressure line finalized as "work you care about needs enough protected time to become ready for other people to see it."
- Structural changes: literal headings (2026 overview / What 2026 is about / Creativity, pleasure, and personal projects / seasonal sections with concrete theses); "2026 IN REVIEW" covers only calendar 2026, with Winter 2027 as its own section; interpretive depth added (Saturn and Neptune's distinct contributions, Pluto as leverage, Uranus involuntary-change coverage: health, capacity, caregiving, location, access, accommodation); Saturn non-return content fully absent; key-date titles rewritten ("The calendar tells the truth," "A responsibility reaches its limit"); "Do not let one disagreement become evidence about the entire relationship" added to Autumn.
- The owner's 20-point generation logic recorded verbatim as canonical: `tldr-astro-phrasebank/TLDR-YEAR-AHEAD-GENERATION-LOGIC-OWNER.md`, with the three post-ruling refinements appended (SR-moment section removal supersedes point 13's first heading).
- Deterministic re-check: no em dashes; banned lists clean; no Saturn-return references. Density note: "application" ×8 across the longer report; occurrences are spread across distinct factor anchors (May Pluto terms, August eclipse, February Midheaven) rather than one menu repeated, which point 11 permits — flagged for the owner's judgment rather than trimmed.
- Status: superseded by v15.

## Candidate v15 (owner deep-interpretation pass) + generation logic v2

- Candidate: `artifacts/marie-satori-year-ahead-2026-candidate-v15.md`, SHA-256 `a16d768ee48684fa492b01ffcf1d811e262e5bc0e3891277e923dabdacaf9bc5`
- Method: owner-supplied full rewrite deepening v14. Additions: job-search coverage inside the May Pluto passage (interview/application as clarifier of what one is "no longer willing or able to build your life around"); the health-accounting nuance paragraph ("This does not mean every busy week is a health problem... the body and routine are part of the accounting"); Autumn's evidence paragraphs ("Maybe the work itself is fine, but the hours are not... The first version gave you something to test. October gives you evidence."); the Midheaven employment-status paragraph (looking for work / self-employed / paid work not central); involuntary-change threading through the overview, the twelfth-house explanation ("outlived the life they were built around"), Winter eclipse, and Review; "sex, a relationship" added to the Oct 20 shared-decision list; overview seasonal preview extended.
- The generation logic is updated to the owner's expanded 26-point version, recorded verbatim in `tldr-astro-phrasebank/TLDR-YEAR-AHEAD-GENERATION-LOGIC-OWNER.md`, superseding the 20-point version. New points relative to v1: PURPOSE preamble, START WITH THE YEAR with bad/better example, LIVED EXPERIENCE IS REQUIRED with per-house menus, HEALTH WRITING with bad/better, SPECIFICITY IS NOT SCRIPTING, SEMANTIC REPETITION, OVERVIEW/REVIEW different jobs.
- Deterministic re-check: no em dashes; banned lists clean; no Saturn-return content.
- Status: superseded by v16.

## Candidate v16 (owner coverage-gate pass) + generation standard v3

- Candidate: `artifacts/marie-satori-year-ahead-2026-candidate-v16.md`, SHA-256 `2bae2cdffe4a830f3e3dfb03f2324938d9738f981c9c17024f50e0f13e12398c`
- Method: assembled from the v15 base by applying every owner edit as an assertion-checked exact replacement (no drift outside named changes). Additions, all verified chart-earned against the computed chart before archiving: spirituality/meaning (12th-house profection + Neptune-trine-Jupiter anchor), detachment/withdrawal (12th house + Uranus-square-Sun), love/dating/relationship threading (SR 5th-house emphasis + Venus Lord of the Year), "move" added to the 4th-house eclipse menus (eclipse on natal Saturn, whole-sign 4th), relationship variants in the Uranus, Pluto, Moon-square, and Mars-opposition passages, and the Winter 2027 circumstance paragraph.
- The generation standard is updated to the owner's 27-point GENERATION STANDARD (verbatim in `tldr-astro-phrasebank/TLDR-YEAR-AHEAD-GENERATION-LOGIC-OWNER.md`), superseding the 26-point version. Headline change: the CORE RULE coverage gate (the chart decides the coverage; no completeness padding, no leaving genuine chart material behind), plus new domain rules for home/moving/family, love/relationships, spirituality/meaning, and detachment/withdrawal, and formal "whether"/em-dash bans in VOICE. v16 is its reference implementation.
- Deterministic re-check: no em dashes, no "whether", banned lists clean, colophon and attribution lines preserved from v15.
- One semantic-repetition note, not edited: "One easy yes can take/become three hours you did not have" appears in both the overview preview and the Summer anchor. As a deliberate signature refrain it is defensible; flagged per rule 17's spirit for the owner's judgment.
- Status: FINAL. See closing entry.

## FINAL (owner declaration, 2026-08-09)

- The owner supplied the complete v16 text verbatim and declared it "the final." Because the owner authored and supplied this exact wording, the report text is **owner-authored final**, not merely approved generated copy. Archived as `artifacts/marie-satori-year-ahead-2026-FINAL.md`, SHA-256 `2bae2cdffe4a830f3e3dfb03f2324938d9738f981c9c17024f50e0f13e12398c` (byte-identical to candidate v16; spot-verified against the owner's final paste).
- **Explicit approval recorded:** the repeated refrain "One easy yes can take/become three hours you did not have" is owner-approved in both positions (overview preview and Summer anchor) as a deliberate signature line.
- Consequences: (1) the FINAL text is eligible as `owner_authored_final` voice evidence for the Year Ahead surface in future writer packets, replacing nearest-surface adaptation; (2) it is the reference implementation of the 27-point GENERATION STANDARD; (3) the Year Ahead candidate cycle (v1 → FINAL, 2026-08-07 to 2026-08-09) is closed. All units resolved.
- Lineage for the record: v1 computed prototype → v2 writer/judge pass → v3–v7 owner line edits → v8 chart-layer correction (SR Venus, computationally verified) → v9 accessibility pass → v10 manifestation pass → v11 density refinement → v12 full ruleset rewrite → v13 tone rewrite → v14 restructure (literal headings, calendar-year review) → v15 deep-interpretation pass → v16/FINAL coverage-gate pass. Every rule discovered en route is codified in `TLDR-YEAR-AHEAD-GENERATION-LOGIC-OWNER.md` (27-point standard) and `TLDR-YEAR-AHEAD-MANIFESTATION-SETS-OWNER.md` (record format + worked sets).

## Units awaiting the owner’s exact-wording approval

- Cover
- Solar-return moment
- How big
- Stance
- Where the light falls
- This winter
- Spring
- Summer
- Autumn
- Next winter
- Looking ahead
