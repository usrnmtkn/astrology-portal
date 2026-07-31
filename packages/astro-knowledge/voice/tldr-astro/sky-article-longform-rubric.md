# Voice rubric — sky placement articles (the second judge)

**Repo copy is canonical for Codex:** `packages/astro-knowledge/voice/tldr-astro/sky-article-longform.json` (machine spec), `sky-article-longform-rubric.md` (this document), and `scripts/judge-article-voice.js` (the runnable judge). Edits here must be mirrored there.

The card rubric (`RUBRIC.md`) judges daily-copy surfaces: compressed, collective, no "you," every sentence quotable. Articles are a different instrument and get judged here. Same lexicon, same ban list, different rules for what "in voice" means. Derived from the owner's published pieces: Mercury Enters Virgo, Venus in Cancer, Venus in Virgo, the Relationship Year, Saturn enters Aries, Jupiter in Cancer, and both Uranus station pieces.

## What is licensed on articles that cards forbid

- **Second person.** Articles talk TO the reader. "You" is the register, not a violation.
- **Questions.** Owner's articles ask real ones: "What deserves your most careful attention?"
- **Contractions and first person.** "Look, I'll be honest with you" is a signature move, one per article at most.
- **Length.** Articles breathe. A block can run ten sentences if every one earns its place.

## The ten checks

1. **Empathy first.** Does it open on the reader's felt experience before any astronomy? The owner spends a paragraph to a page on the feeling ("It's exhausting to keep adapting just to get through a world that seems to demand you be everything to everyone") before a single planet is named. If the article opens with the cosmos, it fails this check. The {{seasonOpener}} does not count; the body itself must land on the reader first.
2. **Spoken, not written.** Read the middle third out loud. Any sentence that sounds like a think tank, a consultancy, or a cultural-studies seminar fails ("the credentialing of knowledge contested" was a real failure). The test: would she say this across a table?
3. **Maybe-lists.** Are the abstractions cashed into real life somewhere? The owner's move: "Maybe it was a job loss or a company re-org. Maybe your living situation no longer fit... even something like mold in the house, or flood." At least one concrete Maybe-list or equivalent scene-run per article.
4. **Command runs where the planet is kinetic.** "Stop saying yes before you've thought it through. Stop filling every silence with your voice." Two or three imperatives in a row, then release. Expected in Mars, Uranus, and Saturn territory; optional elsewhere.
5. **Per-planet furniture, not genre furniture.** Each planet's articles inherit the structure of THAT planet's published piece. Jupiter carries titled Collective Themes subsections and a practice section. Uranus flows without subsections and carries look-back questions plus previous-transit date lists. Saturn carries the first-person aside and mythology closes in blocks. Do not import one planet's furniture into another's article. Where no published piece exists (Neptune, Pluto, Chiron), default to flowing prose and mark the structure provisional.
6. **The teaching correction.** Every article contains at least one owner-style correction of a common confusion, stated plainly: "Love isn't the same as comfort." "Being adored isn't the same as being loved." "Repair is progress." If the article never corrects anything, it is describing, not teaching.
7. **Benediction or handoff close.** The body ends warm and forward: a benediction ("May we each find the courage to let our authentic disruption reshape the world"), an affirmation with her label, or the next-sign handoff. Never a summary paragraph.
8. **Blocks in the situation-permission shape.** Each rising block: house in life terms, the reader's pattern named kindly, the concrete instruction, the permission, stop. No aphorism after the permission. Challenge/opportunity closes ("Your challenge is... Your opportunity is...") are licensed; they are hers.
9. **Dates in prose, mechanics honest.** Every date reads as a sentence, never a list item inside body copy (Key Dates lists are the exception, per her format). Degrees appear at stations. Claims about history are checkable and marked pending engine confirmation until confirmed.
10. **Lexicon and ban list clean.** The linter covers the lexicon fails and warns PLUS the House ban list trade vocabulary (audit, ledger, compound, colonize). Owner-verbatim text outranks any hit.

## Scores

- **3 — in voice.** Yes across all ten.
- **2 — minor drift.** One or two checks soft: a stiff paragraph, a missing Maybe-list, genre furniture in one section.
- **1 — out of voice.** Empathy-first missing, think-tank register in the body, wrong planet's furniture, or any unaddressed fail-word.

## LLM-as-judge prompt (checks 1 through 7)

> You are the editor for Marie Satori, an astrologer whose articles read like a wise, direct friend who has done her homework. Her articles open on the reader's felt experience before any astronomy, speak in second person, cash every abstraction into concrete daily life ("mold in the house," "the text getting misread"), correct one common confusion plainly, and close on a benediction or a warm handoff, never a summary. She is never corporate, never academic, never mystical for effect.
>
> Score the article below 1 to 3 on: (a) opens on feeling before cosmology; (b) middle third sounds spoken, not written; (c) abstractions cashed into concrete scenes; (d) contains a plain teaching correction; (e) ends warm and forward, not summarized.
>
> Return the score, the three weakest sentences, and one rewrite of each. Do not rewrite the whole article.
>
> ARTICLE:
> {article}

## Calibration set

The owner's published pieces are the calibration set: `TLDR-Article-Edition-Saturn-Aries-2025-OWNER.md`, `TLDR-Article-Edition-Jupiter-Cancer-2025-OWNER.md`, both Uranus OWNER files, and the Mercury Enters Virgo and Venus conversions. Every one of them scores 3 by definition. If a change to this rubric makes an owner piece score below 3, the change is wrong, not the piece.

## Standing practice

Every article-tier write-up runs BOTH judges' mechanical layer (lexicon plus trade vocabulary) and THIS rubric's ten checks before presenting. The card rubric never judges articles; this rubric never judges cards.
