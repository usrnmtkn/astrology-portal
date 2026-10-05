# Horoscope period prompt audit

Owner direction: `thread:01a0ce6e-69e0-7100-bdba-ad413d5c7804`, 2026-10-04.
Audit base: `8585b3b80dfa3ca9bb1abb9ce9bf62d0a04cb001`.
The release PR records the tested head and production merge revision.

## Demonstrated defect and correction

The saved Daily Voice required naming the calculated planet and sign. A second
shared paragraph independently required introducing specific astrology. Neither
instruction expressed the owner's brief, nontechnical Daily requirement. This
was an instruction conflict, not evidence that a particular model setting caused
every weak passage.

Daily Voice now specifies a brief reading around one recognizable experience,
ordinary language for the life area, no numbered houses or technical explanation,
and optional planet/sign naming when useful. The duplicate compulsory astrology
paragraph is removed from Daily only. Existing complete references, source roles,
Structure and Prompt remain intact. Weekly remains a distinct format.

The authenticated profile update used the previous saved timestamp and checked
all four profiles before and after saving. Daily revision 5 became revision 6;
only Voice changed. Revision 6 was read back in the live Content Studio editor
with an all-changes-saved state. Its profile hash is
`0d71ae17cc2fb939dbf11da241e181f863e62e078e464061606fffdb834b1e93`.

## Separate acceptance contracts

| Period | Required reader result | Verified request evidence | Remaining editorial limit |
| --- | --- | --- | --- |
| Daily | Brief, nontechnical, one developed experience; no numbered houses | Corrected Voice reaches actual provider request; no Monthly contract or Seasonal review; three complete Weekly passages retain their correct reference role and exact hashes | The selected corpus is Weekly voice evidence, not approved owner Daily examples; no new Daily prose was evaluated |
| Weekly | Compact sign reading with connected meaning and ordinary life areas; no Monthly TLDR or synthesis | Saved revision 12; three primary passages, all 24 complete private PDF comparisons and their separate corrections preserved; no Monthly instructions | Some primary prose overlaps the PDF comparisons, so source counts are not counts of independent evidence; no fresh draft was evaluated |
| Monthly | One shared calendar-month overview, an astrology-specific TLDR, connected planetary developments, no personal houses | Saved revision 16; separate headline/TLDR/body schema, four primary essays with exact hashes, two complete saved comparisons, Monthly synthesis boundary | Delivering this evidence does not establish a specific or faithful thesis; the saved synthesis and resulting prose still need a paired editorial comparison |
| Seasonal | Shared zodiac-season introduction plus deeper sign readings, exact seasonal dates and supplied learning axis | Saved revision 22; current calculated introduction and Gemini requests; three primary essays, plus three complete same-sign readings for Gemini; Seasonal source priority present | Published Libra readings used revision 12 and cannot prove the tone of revision 22 |

The request inspection used the real preparation and canonical writing pipeline,
an injected writer that captured its input and immediately stopped, and no
provider call. Primary passage hashes were recomputed from the supplied text.
Complete saved comparison blocks were checked byte for byte. Template variables
resolved, audience schemas remained separate, and the horoscope request used its
own editorial authority rather than the generic Sky long-form instruction.

Current Daily, Weekly and Monthly draft slots were empty at audit time. Saved
rejected writing and older published editions are historical evidence, not
outputs of the current settings. No draft, published reading, approval or
generation state was changed for this audit. No paid generation was started.

## Editorial review limits

The public Virgo Season 2025 and Weekly September 7–14, 2025 sources were reviewed
alongside the governed corpus. Their individual passages develop a thought
through specific observations, variable rhythm and connected consequences.
The longer Weekly article overview is not a length template for every sign
reading. The current owner's vocabulary and punctuation corrections supersede
historical source usage.

Source identities are resolved through `data/writing/seasonal-horoscope-units.json`
and the governed owner-corpus reference surface
`weekly-horoscopes-sept-7-14-2020.md`. Identifying site metadata remains in the
protected source records.

A future editorial comparison must hold facts, model/settings, references and
audience constant and trace one TLDR or passage through supplied meaning, saved
synthesis and final wording. Assess preserved meaning, recognizable experience,
the reason the astrology matters in this window, and development beyond generic
advice. Do not replace enthusiasm with public recognition or count vocabulary
similarity as semantic fidelity. Any paid comparison requires a bounded scope
and explicit authorization. Passing request or deployment tests is not an owner
authorship verdict.

## Verification

- Full `npm run test:content-studio-api` passed in an isolated checkout with its
  own `npm ci` dependencies. The Daily actual-handler regression checks the new
  instruction and absence of the conflicting requirement and longer-period rules.
- Fresh production-build browser flow passed: `STUDIO_PRODUCTION_ENTRY=1 npx
  playwright test --config=playwright.horoscope-writing.config.ts --grep 'AI
  Writing saves, previews and handles conflicts at 390 light'`. This exercises
  profile selection, preview, save, reload and conflict protection through actual
  handlers with isolated storage.
- Web bundle budgets passed without widening any limit.
- Production profile checks are authenticated readbacks; browser write tests use
  isolated storage. The exact-head API workflow and production deployment belong
  to the release record, not to the local verification claims above.
