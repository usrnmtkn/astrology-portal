# Moon routing in You and Friends

Status: source preparation, not deployed or accepted.

The owner requested all 60 Moon records, including the 15 natal aliases, to be
selectable live, then explicitly required verification in the actual You and
Friends readers rather than Studio previews. Published wording and historical
alternates must remain unchanged.

## Confirmed source gap

On main `5187d023c10b0610dd8ade3b0e7960df82f36bfb`,
`buildNatalTransitItems` creates an ID from planet, aspect and natal point.
`personalTransitPackageSection` supplies `voice:id` as the Moon variant seed.
The You voice is always `you`. Neither date, user nor calculated occurrence
changes that seed. Enumerating all five supported aspects and the complete
60-variant library selects only 24 identities, including five aliases. The
other 36 cannot be selected by this You adapter on any date. This is separate
from a correctly ranked feed omitting a particular Moon contact today.

The shared `natalTransitTargets` adapter also omits MC/IC even when the Swiss
snapshot has a calculated `midheavenLongitude`. The snapshot stores angles
separately from its planet/node positions. The two Moon/Midheaven source
identities therefore have no calculated candidate in either actual reader.

Earlier numeric Studio verification remains valid. Its arbitrary test seeds
established resolver reachability, not reachability through the actual inputs
of the You adapter. The earlier live Friends control was a Mars contact and
did not establish actual Moon reader acceptance.

## Candidate repair

Include the selected civil reading date in the Moon source seed shared by You
and Friends. A date-only You input is already a civil date; a Friends sky
instant is converted in its viewing time zone. A reload or repeated hour on
the same date produces the same selection. A different date can select another
existing eligible source. Other planets retain their previous source policy.

This selects among contact-source variants. It does not rotate historical
alternates: readers continue to request primary writing. Source priorities,
ranking policy, stored identities, publication state, all prose
and historical alternate fields are unchanged.

The target adapter additionally supplies the calculated MC and its opposite IC
when birth time is reliable and the longitude is finite. Unknown-time charts
retain their angle exclusion. This repairs the existing MC/IC axis contract;
it adds valid candidates for other transiting planets too, so the resulting
ranked list can change while its scores and limits remain unchanged. No angle
is inferred from an unknown time and no astrology calculation is replaced.

## Required evidence

- Retain the old adapter's unreachable-source regression, then check all 60
  canonical and alias identities with real adapter input shapes over dates.
  This is source reachability, not proof that each date has a calculated event.
- Check civil-date agreement between You and Friends, local midnight, DST,
  same-day reopen/reload stability and unchanged non-Moon selection.
- Exercise `buildNatalTransitItems`, the shared App normalizer and the Friends
  approval filter together for all 60 identities, using synthetic natal targets
  derived from independently calculated Swiss Moon positions. Compare complete
  passages. This isolated adapter test cannot establish live feed discovery.
- From a fresh app build, navigate normal You and Friends transit lists, open
  calculated Moon contacts, compare full source passages, and reload/reopen.
  Assert the exact selected source, not only an arbitrary marker appearing.
  Keep approved non-Moon transit sources in the fixture so missing competitors
  cannot artificially promote Moon into the eight eligible Friends cards.
- Separately use normal authenticated production readers and their date picker.
  Preserve existing charts and profiles. No Studio preview, injected production
  facts, storage edits, forced ranked cards or paid generation can substitute
  for this evidence. Record genuine ranking or discovery limits explicitly.
- Compare preserved primary/alternate hashes and source identities; retain
  missing-history refusal. Tie live acceptance to the exact READY deployment.

No actual-reader acceptance or deployment is claimed by this document.

## Qualified production diagnostic, October 16

Before this candidate, on main `5187d023c10b0610dd8ade3b0e7960df82f36bfb`,
normal You date selection for October 26 opened Moon sextile Mercury from
`authored/transit-aspect/moon/m/soft/variant-B`. Its complete 393-character
primary passage matched the preserved source after calculated-token
substitution, including after reload and reopening. This proves one actual
alias journey, not all 60 identities.

Existing Friends charts and genuine dates were inspected without altering
profiles or ranking. Their top-eight lists did not expose a transiting Moon
contact. Actual Friends Moon acceptance therefore remains unverified; a Mars
control or a Studio preview is not a substitute. The owned diagnostic tab was
closed at 19:44:07 UTC. Canonical deployment brackets before and after matched
`dpl_2Xq28ZZBH7jayRKpdCAqLWqddFWF`. The observed console had no errors and 24
warnings, including two missing Uranus-return sources. No content was written.
