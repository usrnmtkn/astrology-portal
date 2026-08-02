# Live Sky Placement Audit — 2026-08-02

## Decision

Keep the 168 live Sky Placement write-ups in place. They are complete and mechanically clean. Do not replace the library wholesale.

Improve it in small, draft-only waves. The first wave should target batch-level sameness in otherwise canonical-source placements. Chiron and node placements need a separate provenance pass before any rewrite because their current approved reader copy traces to the legacy CC raw-source lane.

## Scope

- 14 bodies × 12 signs = 168 write-ups
- Five approved rows per write-up: tagline, hook, lived, turn, and moves
- 840 rows inspected in `fallback-source-rows-v3.json`
- Current placement linter, banned-word rules, and CC/SD recognizability matcher applied to every complete five-slot article
- Cross-library checks for repeated taglines, hook openers, move openers, and shared three-word phrases

## Results

| Check | Result |
| --- | --- |
| Complete five-slot write-ups | 168 / 168 |
| Approved rows | 840 / 840 |
| `body_you` / `body_they` parity | 840 / 840 |
| Linter score 3 | 168 / 168 |
| Linter warnings or failures | 0 |
| Duplicate taglines | 0 |
| Shared trigrams above the 15% batch threshold | 0 |

The library passes the mechanical floor. Its remaining issues are editorial, not structural.

## Editorial findings

### 1. Hook openings repeat

Six opening formulas appear at least three times:

- `You notice how` — 5
- `You notice the` — 5
- `You want to` — 5
- `You spot the` — 4
- `Someone says one` — 3
- `You hesitate to` — 3

This affects 25 write-ups. The repetition is visible when multiple placements are read together even though each article passes individually.

### 2. Moves repeat as templates

The most repeated starts are:

- `Name one thing you` — 7
- `Say no to one` — 7
- `Make a list of` — 5
- `Start a conversation by` — 4

Eleven additional move starts appear three times. These are not banned phrases, but they make the library feel generated as a batch.

### 3. Eleven shape advisories deserve human review

Nine articles end with a closer longer than the preferred 22-word maximum:

- Chiron in Scorpio
- Mars in Capricorn
- Neptune in Libra
- Saturn in Capricorn
- South Node in Capricorn
- South Node in Gemini
- Uranus in Cancer
- Uranus in Pisces
- Venus in Aries

Two articles have a five-sentence lived section where the preferred range is two to four:

- North Node in Virgo
- South Node in Aries

These are notes, not lint failures, but they are good rewrite candidates because several also share hook or move formulas.

## Provenance findings

- 126 write-ups primarily trace to the canonical placement corpus.
- Four include owner-gold source rows: Venus in Virgo, Moon in Scorpio, Chiron in Aries, and Pluto in Aquarius.
- 35 write-ups — the remaining 11 Chiron placements plus all 12 North Node and 12 South Node placements — trace to the legacy CC raw-source lane.
- The CC-derived rows are approved reader copy, not verbatim CC copy. Their provenance is still weaker than the canonical-source lane and should not be relabeled without a real source replacement.
- SD is not used as a factual or doctrinal authority for these placements.

The recognizability tic list should remain. It protects house voice and does not make CC or SD an authority. The provenance issue should be corrected by replacing legacy source inputs, not by reverting the voice safeguards or deleting approved reader copy.

## Vocabulary status

The current placement generator now receives the owner-first vocabulary palette:

- Owner vocabulary is authoritative.
- Shared owner/SD and owner/AC individual words are optional lexical choices.
- SD and AC phrases, metaphors, cadence, facts, and dates are excluded.
- The palette is a menu, never a quota.

Most live placement rows predate that vocabulary bank. A rewrite pilot is the correct way to measure whether the palette improves the copy; the live library should not be assumed to have received this tuning retroactively.

## Recommended rewrite order

### Wave 1 — draft only, canonical sources

Use the current owner-vocabulary prompt and judge, but do not publish automatically:

1. Mars in Capricorn
2. Saturn in Capricorn
3. Neptune in Libra
4. Venus in Aries
5. Uranus in Cancer
6. Uranus in Pisces

These have clear shape or repetition findings and do not require the CC-derived source lane.

### Wave 2 — draft only, repeated openings

Choose a representative subset from the repeated hook clusters. Judge the batch together so a rewrite does not merely replace one repeated formula with another.

### Wave 3 — provenance first

Before rewriting the 35 Chiron/node placements, approve canonical point-through-sign meanings or an explicit derived-axis policy for the South Node. Then generate from those records and retire the CC raw-source dependency. Do not promote the existing DRAFT point records merely to make the generator run.

## Release gate for every wave

- Keep the existing live article as the baseline.
- Generate into a draft-only output directory.
- Require placement lint score 3.
- Require judge score 3.
- Run the cross-draft sameness audit on the whole wave.
- Compare the draft with the current live copy and owner corpus before any row is replaced.
- Promote only the individual write-ups the owner approves.

The first six-card GPT-5.6 pilot and its prompt-leakage findings are documented in `sky-placement-rewrite-pilot-gpt-5.6-2026-08-02.md`.
