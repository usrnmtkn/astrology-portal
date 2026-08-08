# Codex prompt — wire the corpus warmth harvest into Calendar timing copy

Copy everything below the line into Codex. This prompt is self-contained except for one repository
file it explicitly references: `docs/editorial-ai/method-corpus-warmth-harvest.md` (the owner-approved
harvest method). No billed calls; wiring and spec work only.

---

The owner-approved corpus warmth harvest (`docs/editorial-ai/method-corpus-warmth-harvest.md`) is now
required for Calendar timing copy: retrograde phases, stations, ingresses, cazimi when emitted, and
lunation cards. On this surface the harvest is not an addition to the composition contract - it IS the
selection method for the contract's sixth component, "owner voice models." Implement the following.

## 1. Harvest step in the timing packet builder

- **Core per event family AND phase, not per planet.** The emotional core comes from the V9 timing
  meaning records (the Meaning notes and Scenes), and it differs by phase: a Mercury station
  retrograde ("a pause reading, not a failure reading") is not the Mercury passage ("returning is not
  failing; returned material wants completion") and not the station direct ("the review resolves").
  Ingress cores come from the arrival meaning; lunation cores from the lunation macro set. If a
  record's meaning note yields no nameable warmth core, compile as `harvest_mode: none_found`, attach
  a non-blocking editorial flag, and keep the copy plain. Calendar warmth harvesting never fails
  closed or requests new owner prose.
- **Search the owner corpus with a standing family map**, refined per event at build time:
  - Retrograde phases → the owner's retrograde articles (mercury-retrograde-in-leo,
    chiron-retrograde-in-aries, uranus-rx-gemini, mars-direct-in-cancer, the Venus
    relationship-year material).
  - Stations → her station and "direct" passages (energetic closure, integration, "whatever surfaced
    now begins to integrate").
  - Cazimi → her cazimi lines (the 2025 overview's Mercury and Pluto cazimi passages).
  - Ingresses → her season articles (virgo-season, libra-season, gemini-season, aquarius-season and
    the sign-season family).
  - Lunations → the new-moon and full-moon articles, the richest single mapping in the corpus.
  Also check the VB-005 signature-phrase inventory for every event.
- **Select** only turn-toward-the-reader lines (feeling named from inside, or permission and
  reassurance). Pure observation does not qualify. Lines must survive the ban list unaided.
- **Supply** one to three candidates as OWNER FOUNDATION LINES with source-article IDs and the
  instruction: "Adapt one into the card where it lands naturally, keeping its meaning and register.
  Verbatim is preferred when it fits. Use at most one."
- **No corpus match:** compile with `harvest_mode: none_found`, no foundation lines, and the
  non-blocking `owner-corpus-warmth-none-found` info flag. Do not invent a permission, reassurance,
  benediction, or turn-toward-the-reader line.

## 2. Pronouns and surface rules

Calendar timing copy is Current Sky: collective voice, never second person, no "people." Foundation
lines containing second person are minimally collectivized at packet-build time; the original wording
stays in provenance. Moon ingress remains permanently excluded - no harvest, no card. All existing
timing rules hold: engine is the only date authority, hyphenated event enums, underscore content
keys, the 17-arcminute cazimi definition, and the four owner-approved V2 timing cards (Mercury
station Pisces, Venus retrograde Scorpio, Chiron station Taurus, Jupiter ingress Leo) serve as the
surface's format exemplars.

## 3. Scale rule (enforced)

- Full timing cards (two-paragraph structure) with a matched foundation: at most one warmth beat,
  placed after the phase's pressure or cost is named, in the second paragraph. Under `none_found`,
  no warmth beat is required or invented.
- Collapsed-card previews: no added beat; `harvest_mode: vocabulary_only`.
- The stacked-ending rule applies unchanged: a warmth beat followed by a second conclusion fails.

## 4. Provenance

Cards using a foundation line record `warmthSource: {sourceArticleId, originalLine, usedForm}` and
are labeled owner-corpus-derived. Evidence-class metadata only; approval gates unchanged. Claim-level
provenance on the meaning components (CC/AC/SD/Rodden tags) is untouched - the warmth line is the
owner component and is recorded separately from the adjacent-source components.

## 5. Judge addition

Add to the timing judge spec: "The card's turn toward the reader must trace to the supplied owner
foundation lines when present. Invented permission or reassurance in place of supplied material
scores 2; no turn at all when foundation lines were supplied scores 2. Verbatim use of a supplied
owner line is never copying. The warmth line must match the PHASE's core - a station-direct
reassurance on a station-retrograde card is a phase mismatch and scores 1. Under `harvest_mode:
none_found`, require no turn toward the reader and do not penalize its absence."

## 6. Verify

- A Mercury station-retrograde packet and a Mercury station-direct packet select DIFFERENT foundation
  lines (phase-specific cores).
- A timing event with no qualifying corpus match compiles as `none_found`, carries the non-blocking
  info flag, supplies no foundation line, and requests no new owner prose.
- A Venus retrograde packet draws from the Venus relationship-year material; a Virgo ingress packet
  draws from the Virgo season family.
- A Moon ingress request produces no packet.
- Sky-surface packets show collectivized lines with originals in provenance.
- A preview generation carries `harvest_mode: vocabulary_only`.
- The four approved V2 timing cards still lint clean and remain the format exemplars.
- Owner calibration pieces still score 3.

Out of scope: generating or revising timing copy (separately authorized), cazimi and shadow event
emission (still blocked in the engine), serving, wiring, and promotion.
