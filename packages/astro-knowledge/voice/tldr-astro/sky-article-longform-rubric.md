# Voice rubric — sky placement articles (the second judge)

**Repo copy is canonical for Codex:** `packages/astro-knowledge/voice/tldr-astro/sky-article-longform.json` (machine spec), `sky-article-longform-rubric.md` (this document), and `scripts/judge-article-voice.js` (the runnable judge). Edits here must be mirrored there.

The card rubric (`RUBRIC.md`) judges daily-copy surfaces: compressed, collective, no "you," every sentence quotable. Articles are a different instrument and get judged here. Same lexicon, same ban list, different rules for what "in voice" means. Derived from the owner's published pieces: Mercury Enters Virgo, Venus in Cancer, Venus in Virgo, the Relationship Year, Saturn enters Aries, Jupiter in Cancer, and both Uranus station pieces.

## What is licensed on articles that cards forbid

- **Second person.** Articles talk TO the reader. "You" is the register, not a violation.
- **Questions.** Owner's articles ask real ones: "What deserves your most careful attention?"
- **Contractions and first person.** "Look, I'll be honest with you" is a signature move, one per article at most.
- **Length.** Articles breathe. A block can run ten sentences if every one earns its place.

## The ten checks

1. **Human stakes early.** Does it establish the reader's felt or material stakes early? Felt-first is preferred for generated editions. The canonical corpus also contains transit reports that name the event or date first, then promptly translate it into lived stakes. Fail only when the opening stays in astronomy or exposition without making the transit matter in human terms. The {{seasonOpener}} alone does not satisfy this check.
2. **Spoken, not written.** Judge the dominant register. Saturn and Jupiter collective overviews may carry denser historical or essay passages, but they must return to direct, concrete language. Fail sustained think-tank, consultancy, or cultural-studies phrasing that never lands in lived terms ("the credentialing of knowledge contested" was a real failure); do not fail a few formal sentences inside an otherwise spoken article.
3. **Maybe-lists or concrete scene-runs.** Are the abstractions cashed into real life somewhere? The owner's move includes job loss, a company re-org, a home that no longer fits, mold, a misread text, a budget, or a body limit. The word "Maybe" is not required.
4. **Command runs where the planet is kinetic.** "Stop saying yes before you've thought it through. Stop filling every silence with your voice." Two or three imperatives in a row, then release. Expected in Mars, Uranus, and Saturn territory; optional elsewhere.
5. **Planet-specific article structure, not generic genre structure.** Each planet's articles show family resemblance to THAT planet's published structure. Jupiter may carry titled Collective Themes subsections and a practice section. Uranus may carry flowing prose, look-back questions, and previous-transit date lists. Saturn may carry the first-person aside and mythology closes in blocks. These structural devices form a menu across each planet's corpus, not a mandatory checklist for every edition. Missing one item is soft at most; conspicuously importing another planet's structure is a failure. Where no published piece exists (Neptune, Pluto, Chiron), default to flowing prose and mark the structure provisional.
6. **The teaching correction.** Every article revises the reader's understanding somewhere. A plain contrast ("Love isn't the same as comfort"), grounded boundary, limit, or reframe qualifies; the exact "isn't the same as" syntax is not required. If the article only describes and never corrects or reframes, it is not teaching.
7. **Benediction or handoff close.** The editorial body ends warm and forward: a benediction, labeled affirmation, next-sign handoff, or final horoscope-block release into concrete direction. Never a summary paragraph. Ignore navigation, related links, calls to action, and trailing non-editorial page chrome such as "Refer a friend" when locating the close.
8. **Blocks land in the planet's canonical shape.** Where rising-sign or house blocks exist, judge those blocks rather than the whole article: house in life terms, the reader's pattern named kindly, concrete direction, then permission, integration, mythology, or a forward path from that planet's canonical structure. Articles without rising blocks are not failed here. Do not bolt a generic aphorism onto a block after it has landed. Challenge/opportunity closes are licensed; they are hers.
9. **Engine/date QA—not voice-scored.** App-generated dates and times come from the configured ephemeris and user-local timezone. Dates read as sentences in body copy; datelines, Key Dates, Previous Transits, and reference lists are licensed structured exceptions. Degrees appear at stations. Claims about history remain checkable. This check stays in the shared QA contract but is not sent to the voice model.
10. **Lexicon and ban list clean.** The linter covers the lexicon fails and warns PLUS the House ban list trade vocabulary (audit, ledger, compound, colonize). Owner-verbatim text outranks any hit.

## Judge interpretation

- Judge family resemblance, not a quota of signature devices. The canonical corpus contains both felt-first essays and transit-first reports.
- Evaluate editorial body copy only. Ignore fixture/conversion wrappers, datelines and tags, navigation, related-post lists, calls to action, and trailing non-editorial page chrome.
- Concrete equivalents count without trigger words.
- Missing one optional structural device is soft at most; wrong-planet structure is the failure.
- A 1 requires systemic material drift or one severe failure. A licensed opening or close, or one missing optional device, cannot produce a 1 by itself.

## Scores

- **3 — in voice.** Holistically recognizable as the house voice. Licensed equivalents and optional-device variation are not failures. Recommend approval; human approval is still required.
- **2 — minor drift.** One or two material checks soft: a stiff paragraph, weak concrete grounding, or generic genre structure in one section.
- **1 — out of voice.** Systemic material drift across several checks, or one severe failure such as sustained think-tank register, conspicuous wrong-planet structure, or an unaddressed mechanical fail-word. Never a 1 for one optional omission or a licensed alternate opening/close.

## LLM-as-judge prompt (semantic checks)

> You are the editor for Marie Satori, an astrologer whose articles read like a wise, direct friend who has done her homework. Her articles establish human stakes early, speak in second person, cash every abstraction into concrete daily life ("mold in the house," "the text getting misread"), revise one common confusion plainly, and close warm and forward rather than summarizing. She is never corporate, never academic, never mystical for effect.
>
> Treat the checks as diagnostic evidence, not equal quotas. A transit-first opening passes if it promptly establishes lived stakes. Planet-specific article structure is a family resemblance, not a requirement to include every device. Ignore non-editorial page chrome when locating the close. A score of 1 requires systemic drift or one severe failure.
>
> Score the article below 1 to 3 on: (a) establishes human stakes early; (b) middle third sounds spoken, not written; (c) abstractions are cashed into concrete scenes; (d) it teaches through a correction, boundary, contrast, or reframe; (e) its editorial body ends warm and forward, not summarized; and (f) it uses its own planet's structural family rather than another's.
>
> Return the score, the three weakest sentences, and one rewrite of each. Do not rewrite the whole article.
>
> ARTICLE:
> {article}

## Calibration set

The owner's published pieces are the calibration set: `TLDR-Article-Edition-Saturn-Aries-2025-OWNER.md`, `TLDR-Article-Edition-Jupiter-Cancer-2025-OWNER.md`, both Uranus OWNER files, and the Mercury Enters Virgo and Venus conversions. Every one of them scores 3 by definition. If a change to this rubric makes an owner piece score below 3, the change is wrong, not the piece.

## Standing practice

Every article-tier write-up runs BOTH judges' mechanical layer (lexicon plus trade vocabulary) and THIS rubric's ten checks before presenting. The card rubric never judges articles; this rubric never judges cards.
