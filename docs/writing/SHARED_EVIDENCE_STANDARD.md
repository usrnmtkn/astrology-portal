# Shared evidence standard

Owner-authored governance, 2026-08-13. This is a retrieval and verification standard, not a
content reorganization. It governs Codex, the writing engine, and the owner's reviewer.

## Principle

Owner evidence comes in five roles. A pool that returns only one role produces prose that fails
on the others. The 2026-08-13 Venus in Libra failures proved both directions: an empty pool
produced machine phrasing, and a register-only pool produced an invented website scenario while
the owner's own approved Venus-in-Libra scenes sat unused.

## Owner-passage-first retrieval rule (2026-08-21)

Write from actual owner passages, not from a synthesized description of those passages. For
REGISTER evidence, published owner prose matching the exact planet-sign is selected first. If
none exists, published prose for the same sign is selected; if none exists, published prose for
the same planet is selected. When relevant passages exist, the packet must contain at least
three, or every available passage when fewer than three exist. Generic same-surface examples
and register gold may supplement those passages but may never replace them.

The register-gold page demonstrates scene specificity only. It does not license its argument,
paragraph architecture, cultural thesis, or closing construction for another placement.
Assistant-generated prose, summaries of owner style, and derived style guidance are never
REGISTER evidence. A request that omits available relevant owner passages fails retrieval before
credentials or billing.

## Owner-supplied calibration requires explicit authority

Task-supplied examples may establish a reasoning or review standard without
establishing authorship. The governed structural-calibration manifest is
`data/writing/owner-supplied-structural-exemplars.json`. An entry may enter
REGISTER only when it records owner authorship, exact approval, and
positive-register authorization. PHRASE and reader-serving authority remain
separate and must be recorded separately. The approved
Chiron-in-Taurus-in-the-12th-house passage is REGISTER evidence only: it may
guide prose behavior but may not be mined for reusable lines or served as app
copy.

Structural movements are semantic audits, not prose templates. A writer may not
copy the exemplar's paragraph count, hinge sentence, contrast, or close merely
because the example passed structural review.

## Placement-breadth rule (2026-08-21)

The planet-sign mechanism owns the scope of a placement. One strong expression may organize a
page, but it may not become the definition of the placement. Before the owner approves an
argument, the review packet must distinguish the broad mechanism from the chosen expression and
show at least three materially different valid expressions across the life domains supported by
the meaning plan. These are scope checks, not prose slots; the writer is not required to mention
all of them.

If the argument, scenes, and consequences all reduce the placement to one behavior or one social
thesis, the argument is too narrow even when its examples occur in different settings. Adding
more examples of the same mechanism does not fix the defect. Broaden the argument before
drafting. Do not make every paragraph prove a thesis, and do not add an explanation after an
owner-style observation or example has already made the point.

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
- Relevant published owner passages exist but the packet contains fewer than three, or omits any
  when fewer than three exist.
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
