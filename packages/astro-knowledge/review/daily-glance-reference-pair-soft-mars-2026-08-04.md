# Daily At-a-Glance owner reference pair: soft/mars (APPROVED)

Date: 2026-08-04
Status: EXACT OWNER APPROVAL. The owner iterated this pair line by line in chat and closed with "i approve" immediately after being asked to approve the exact headline and body shown below (chat, 2026-08-04). Scope: owner reference exemplar for the daily At-a-Glance surface, voice anchor and structural model for all 68 keys, and approved production wording for the `fallback-hook/daily-headline/soft/mars` and `fallback-hook/daily-body/soft/mars` rows.

Landing record: applied to both production rows (source + bundled, verified byte-identical) by Codex on 2026-08-04; rows set to approved; the other 134 daily rows remain review_needed. Known unrelated failure: the assembly script's lunation assertion (expects renderLunationHoroscope in App.tsx; App calls renderLunationEventCard), pre-existing, ticketed separately in the rebuild plan.

## Approved wording (verbatim; any change requires a new approval)

Headline:

It takes less energy to do the thing than to keep putting it off.

Body:

For the next few hours, it is easier to act on what you want instead of just thinking about it. The task, conversation, or decision you have been putting off may still be annoying, but it feels more possible now. Give it thirty minutes before your mind starts making the case for waiting again.

## Derivation record

- Facts: `data/pairs/moon-mars.json` harmonious ("Emotional energy fuels getting things done"), F2 soft-group boundary (offered, not automatic; passes used or not), F3 mars (action, drive, courage, starting), Ebertin daily scale (hours; small successes).
- Format: P4 record (strong sentence, then supporting description; body 40-65 words, one instruction).
- Iteration: assistant first draft rejected by owner on voice; owner supplied the voice standard, two candidate bodies, and every surviving phrase. Final wording is owner-authored throughout.

## Structural model extracted (for the surface contract and Sol packets)

1. Headline is a general claim in plain effort terms; the day-anchoring lives in the body's opening phrase, not the headline.
2. Body sentence 1: "For the next few hours, it is easier to..." names the offered condition honestly at hours scale.
3. Body sentence 2: a concrete triad of real alternatives (task, conversation, decision) carrying a "may", with honest warmth ("may still be annoying, but").
4. Body sentence 3: one concrete, time-boxed instruction with a recognizable inner obstacle stated literally ("your mind starts making the case for waiting again").

## Owner style markers captured this session (permanent; into the contract voice block)

- SM-DG-1: the reader is the grammatical subject; abstractions do not act ("You feel...", not "the task looks...").
- SM-DG-2: inner states are offered with "may", never asserted as diagnosis.
- SM-DG-3: alternatives are listed as real options (task, conversation, decision), not images; no metaphor ("window", "circling") in this register.
- SM-DG-4: rhythm is even and comma-joined; no staccato punch sentences.
- SM-DG-5: the word "whether" is not owner language; do not use it in generated copy. (Owner, chat, 2026-08-04: "I don't use the word whether.")
- SM-DG-6: the energy ban targets ambient-force language ("this energy", "energy flows"); the ordinary effort-cost sense ("it takes less energy to...") is owner language and passes. Judge the sentence, per the CF-015 pattern.
