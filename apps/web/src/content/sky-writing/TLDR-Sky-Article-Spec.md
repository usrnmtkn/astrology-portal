# Sky Placement Articles — Spec (author's Impact & Clarity template, adopted Jul 22 2026)

Applies to all /#sky/placement pages (planet in sign, retrograde in sign). Replaces the old fallback structure (adjective-triplet template + sign encyclopedia + kumbaya closer).

## Structure (author's PlanetaryPlacement interface)
1. Header: {Planet} in {Sign} / {Planet} Retrograde in {Sign}
2. Date range (UI chip or first line)
3. Opening (shift statement): what changes as the planet enters — 2-3 sentences, verbs like resets/exposes/intensifies/clarifies/redefines, end on a tangible expectation
4. Lived experience: how it shows up — specific, universal (messages, waiting, conversations replaying), body and emotional cues, no location-specific examples
5. Behavioral lesson: what's being tested — 1-2 sentences, no motivational tone
6. Confrontation point: the pattern that breaks — "If you've been…" phrasing
7. Collective influence: the same energy at society scale
8. Personal directive: one clear behavioral direction, active voice
9. [App inserts dated aspect lines here — wrapper format below]
10. Optional house activation: two sentences max per rising sign

## Voice (author's rules)
- Grounded, direct, emotionally intelligent. Second person, present tense. Short-to-medium declaratives.
- Verbs: exposes, tests, clarifies, recalibrates. Never "heals," "reveals," "this energy," "right now" as filler.
- 8 short paragraphs max, 2-3 sentences each.
- Retrograde register: pause/slow/review — "If you wouldn't choose it today, stop living like you did." Old choices get their expiration dates checked; review is grace, not failure.
- Satori word bans (additional to master list): profound, whisper, tapestry, reckoning, dance, weave/woven, shrink, self-erasure, journey, sacred, divine timing, alignment, vessel, container, hold space, transmute, alchemize, integrate (except moon phases).
- Satori construction bans: "It's not about X, it's about Y" · "This is inviting you to…" · "The universe is asking you to…" · "This is an opportunity to…" · "What if this challenge is actually…" · "Consider that perhaps…" · "Notice how you might be…" (NOTE: in THIS vertical the not-X-but-Y reframe is banned even though the compatibility layer licenses it.)
- Master bans still apply (no em dashes, no room/air metaphors, no safe/settle/steady/perform/etc.).

## Dated aspect-line wrapper (replaces "and for everyone at once…")
Format: "[Dates]: [transit fact]. [What shifts, concrete]. [One move]."
Example: "Jul 21–24: Mercury squares Saturn in Aries. Thinking runs slower and heavier, shortcuts stop working, and whatever survives the double-checking is worth keeping. Sign nothing you haven't reread twice."

## Retired elements
- "for everyone at once" wrapper
- "None of us feels alone… many streams moving toward the same sea" closers
- Sign-off signatures ("Clear words and safe harbors,") — pending author decision
- Sign encyclopedia paragraph moves to an expandable "About [Sign]" block if kept at all; it does not interrupt the article

## Quality gate per article (author's checklist, abbreviated)
- Named at least 1 specific self-betrayal behavior, no cushioning
- At least 1 clear permission
- Every abstract noun replaced by actual human behavior
- Reads aloud like a smart, direct friend; no guru, no therapist, no motivational poster

## ADDENDUM (Jul 22 2026): final architecture

### Content tiers (best available wins, per placement per cycle)
1. Author's bespoke cycle piece (imported for a date window; supersedes everything inside it)
2. Authored evergreen article (sky-articles-authored-v1.json; rotation variants A/B/C by cycle when they exist)
3. Composed fallback (assembled from fallback-atoms-v1.json; never blank, never synthesized)

### Retrograde guide format (Chani-scaffold, author-approved)
Header block: When (computed: rx range + shadow dates) / What / TLDR (authored). Sections with short caps headers, including a standing THE COLLECTIVE REVIEW section and a spotlighted key-date section (cazimi for Mercury). Do/Don't list. Handoff line.

### Fallback assembly order
function line → sign-color line (sign-colors-v1.json) → sign mechanics paragraph → collective sentence (collectiveFrames[planet] with [SIGN SUBJECTS] replaced by signSubjects[sign]) → computed walkthrough (narrated beats, chronological) → Do/Don't (doDont["planet.direct"|"planet.retrograde"]) → handoff ("[Planet] moves into [next sign] on [date].")

### Computed slots (ephemeris-owned, never authored)
Ingress/egress dates · retrograde start/end · pre-shadow start / post-shadow end · cazimi date · sign-boundary splits (if a retrograde backs into the previous sign, serve both signs' Rx content across the split) · dated aspect beats injected chronologically into the walkthrough in narrated form ("[Dates]: [fact]. [What shifts]. [One move].") — never the "for everyone at once" wrapper.

### Retired on import
The old fallback structure: adjective-triplet openers, sign encyclopedia interruptions, "for everyone at once" aspect wrappers, kumbaya closers, and dangling sign-off signatures.
