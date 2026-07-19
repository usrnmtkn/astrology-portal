# Compatibility Without a Birth Time — Engine Spec + Fallback Copy
## Jul 18, 2026. Rule set for serving the seven sign-based compatibility layers when either person's birth time is unknown.

## What breaks and what doesn't
- Ascendant, houses, exact aspects: unavailable without a time. (Rising–Rising layer, if ever built, requires time.)
- The seven planet layers are sign-based, so they survive — with one certainty check per planet.
- Ambiguity frequency by planet: Moon ~40% of birth dates (changes sign every ~2.5 days) · Sun ~3% (cusp dates) · Mercury/Venus ~monthly ingress dates · Mars ~every 6 weeks · Jupiter ~yearly · Saturn ~every 2.5 years. In practice: the Moon is the only routine problem.

## Engine rule (per planet, per person)
1. Birth date + place known, time unknown → compute the planet's sign at 00:00 and at 23:59 LOCAL time on the birth date.
2. Same sign at both ends → CERTAIN. Serve the normal card, no caveat.
3. Different signs → AMBIGUOUS. Do not guess, do not silently use noon. Serve the fallback flow below.
4. Never show an ambiguous-planet card as if it were certain; a wrong Moon reading costs more trust than a missing one.

## Fallback flow for an ambiguous planet
Preferred: the picker. Show both candidate signs with their one-line foundations and let the user choose from lived knowledge. Once picked, store it (flag: `sign_source: "user-picked"`) and serve the normal card.

Picker copy template (Moon example, author voice):
> The Moon changed signs on {friend}'s birthday, so without a birth time it could be either one. You know them — which sounds right?
> **Moon in {sign_a}:** {foundation_a}
> **Moon in {sign_b}:** {foundation_b}

The 12 one-line foundations for the Moon picker already exist in TLDR-Moon-Compatibility-Spec-and-Calibration.md (e.g., Aries: "Recovers by acting: deciding, moving, clearing the air the same day." Taurus: "Leans into routine and comfort; calms slowly when nothing is being demanded.").

If the user declines to pick: serve the holding card —
> **Moon-to-Moon**
> {friend} was born on a day the Moon moved from {sign_a} to {sign_b}, so this reading needs either a birth time or your call on which fits. Everything else here still stands; this is the one card that has to wait.

## Reader's own chart ambiguous
Same flow, phrased for self: "The Moon changed signs on your birthday. Which sounds more like you?" Self-picks tend to be reliable for the Moon (people know how they recover); mark the source flag the same way.

## Sun cusp dates
Same picker, Sun foundations from the Sun v6 research notes (e.g., Aries: "self-discovery through action, courage, new experience"). Never write "cusp" copy that blends two signs — the record is one sign or the other.

## Notes
- The measured-aspect app slot stays empty for any no-time chart; sign-layer copy never claims an aspect, so nothing needs rewriting.
- Domain lead-in sentences render regardless — they describe the planet, not the person's placement.
