# Shared evidence standard

Owner-authored governance, 2026-08-13. This is a retrieval and verification standard, not a
content reorganization. It governs Codex, the writing engine, and the owner's reviewer.

## Principle

Owner evidence comes in five roles. A pool that returns only one role produces prose that fails
on the others. The 2026-08-13 Venus in Libra failures proved both directions: an empty pool
produced machine phrasing, and a register-only pool produced an invented website scenario while
the owner's own approved Venus-in-Libra scenes sat unused.

## The five roles and where they live

1. **Meaning:** what this planet-sign means. Source: knowledge matrix (`TransitMeanings` keyed
   planet|sign|event; `HouseActivations` keyed rising|planet|sign|house). Governance tiers apply;
   owner-approved-exact first.
2. **Register:** how the owner writes. Sources: owner-corpus fixtures, the phrasebank voice bank
   and writing standard, and owner-approved gold pages (Saturn in Capricorn for placement
   articles).
3. **Scene:** concrete lived detail a reader can picture. Sources, in priority order:
   owner-approved house-horoscope cores for the same planet-sign; approved serving rows carrying
   three or more distinct scene nouns; matrix rows carrying two or more.
4. **Argument:** the thesis already approved for this placement. Source: the current approved
   article for that planet-sign, used for argument and close only, never as register evidence
   when it predates the current standard.
5. **Phrase:** exact owner-authored lines available for the subject. Sources: the approved
   one-liner voice bank and explicitly owner-confirmed reader-facing rows in the phrasebank JSON
   files. Phrase evidence is tagged by theme, subject, and the failure mode it addresses. It is
   distinct from register examples, which demonstrate voice, and correction pairs, which
   demonstrate judgment.

## Required before any draft

Build a packet containing all five roles. Report it as a named list: source path, content key,
governance tier, and the role it fills. Counts alone are not acceptable; the owner reads the
passages. Select five to ten thematically relevant PHRASE entries and label them `AVAILABLE
LINES`; they may be used verbatim or adapted.

## Blocking preconditions

These fail before credentials are read or billing can begin:

- Empty positive pool.
- Fewer than three same-family register passages, or missing register gold.
- Approved same-planet-sign meaning rows exist and none are in the packet.
- Approved same-planet-sign scene material exists and none is in the packet.
- A family label with no explicit mapping.
- Generated copy presented as owner-authored evidence.
- Any one of the four required evidence roles missing from the packet.
- The target subject matches a voice-bank theme and no PHRASE evidence reaches the packet.

## Writing-engine use

Draw meaning from role 1, voice from role 2, scenes from role 3, the thesis from role 4, and
available owner wording from role 5.
Invented scenes are permitted only where role 3 supplies nothing, must be ordinary rather than
niche, must be plural, and must never carry the argument alone.

## Verification before owner review

Confirm the packet contained the four always-required roles and the conditional PHRASE role.
Confirm scenes in the draft trace to role 3 sources
or, if invented, satisfy the constraints. Run deterministic checks. Report which of the owner's
own approved sentences were available and unused.

The evidence index points to content in place. It never moves, rewrites, reclassifies, or
reorganizes the owner's source material.

## Derived matrix index

Writer retrieval reads the canonical workbook through these owner-supplied derived sidecars:

- `data/writing/matrix-evidence-index/TLDR-Matrix-Evidence-Index.jsonl`
- `data/writing/matrix-evidence-index/TLDR-Matrix-Coverage-By-Placement.json`

The workbook remains canonical. The sidecars add retrieval metadata only. Matrix selection is
filtered to the exact planet and sign, and to the exact event type when the task supplies one.
Meaning, scene, and argument-candidate rows remain separate lanes. Repeated copy is deduplicated
inside the target and role by `copy_sha`; governance precedence chooses the retained source.
Matrix rows tagged `register` remain visible in the index and coverage report but do not replace
the owner-corpus passages or register-gold page as the writer's register authority.

## Derived phrase index

Writer retrieval reads owner phrases through:

- `data/writing/phrase-evidence-index/owner-phrase-evidence-v1.jsonl`
- `data/writing/phrase-evidence-index/coverage.json`

The voice bank and phrasebank JSON sources remain canonical in place. Working, reference,
generated, pending-review, and merely reviewed material is excluded. Exact repeated text is
deduplicated by `copySha` before retrieval.
