# Sky requests before mount — 2026-09-21

This follows the deployed Sky loading release in PR #1003. The owner authorized
this second performance pass in task `01a0c4f7-25c8-7940-aa8f-183716960f8e`.
The implementation is based on refreshed main `9bee69955187ffbb4588d33471e25782039e2510`.

## Behavior

For a direct Sky list link, after authentication callback completion, the entry
point starts the exact-input Sky API request, complete publication refresh while App downloads. Once App is available, the
nine immutable source assets download alongside the large placement module. The mounted reader adopts
the initial instant only for the same day, coordinates, time zone and live/daily
mode, before ten seconds have elapsed on the monotonic clock. A refresh or
changed selection abandons it. StrictMode replay shares the same request.
An unsuccessful speculative API request starts no worker; an active matching
reader uses the existing identical-input local calculation fallback.

The asset loader shares pending and completed requests, bounds requests and
clears failures for retry. The publication ledger and source-plane barrier still
control when complete readings appear. This does not install an early prose
snapshot or bypass revisions, retirements, approvals or exact input validation.

The initial list loads the placement package without the separate house-reading
rows. Articles and Calendar retain the full loader by default. Full readiness
requires both local partitions; a list load cannot masquerade as a full load.
Protected owner passages move out of static App boot into the placement package;
the guard fails closed until its exact source has loaded. No prose, hashes,
approval records, source manifests or calculation algorithms changed.

## Comparable build measurements

Separate clean dependencies and the same anonymous CI configuration were used
for current main and the candidate. Values are gzip bytes at level 9.

| Measurement | Main `9bee6995` | Candidate | Difference |
| --- | ---: | ---: | ---: |
| App startup JavaScript | 460,085 | 455,808 | -4,277 |
| Reader startup including CSS | 512,872 | 508,595 | -4,277 |
| All JavaScript, including deferred routes | 3,447,046 | 3,449,235 | +2,189 |
| Deferred Sky article module | 5,767 | 5,857 | +90 |
| Deferred signup module | 4,127 | 4,189 | +62 |

The aggregate cap increases by 2,500 bytes for request coordination and new
partitions. The two unchanged presentation modules receive 100 bytes each for
changed shared imports. Startup, calculation, content and timing caps do not increase. The later font
delivery fix below has a separate, explicit initial-CSS allowance. Moving protected passages into the requested placement package is
not counted as a reduction in total first-visit bytes. The separately deferred
house-reading chunk is absent from the initial list's requests.

## Verification and release evidence

- Browser regression holds the App response back and requires the facts,
  and publication requests to start first. A separate held placement-module
  response proves canonical assets start without waiting for that module. It checks one API
  request for the unchanged selection and rejects a changed date plus location.
- Initial list requests exclude house-reading and ephemeris assets; opening an
  article requests the house partition.
- Tests cover exact instants, selected-zone noon, DST, stale selection/clock mode,
  expiry, shared asset requests, failed preload recovery, and deferred/full
  renderer parity.
- Existing tests cover publication revisions and retirements, opening and final
  sentences, mobile/desktop light/dark layouts, live Moon ingress, clock refresh,
  Calendar Sun/Moon and protected full-text hashes.
- The house-template test's three stale source assertions were reconciled with
  existing main behavior: selected-day personal transit package copy, explicit
  aspect labels, and `skyActiveChartEvents` filtering. Their old expectations
  predated `a2c162077`; runtime copy was not edited.

The release PR records exact-head API/browser checks, preview measurements and
production deployment verification. Compare full reading readiness using fresh
anonymous 390×844 contexts, 4× CPU slowdown, 80 ms network latency, 1.6 Mbps down,
750 kbps up and the fixed instant `2026-09-21T16:00:00Z`. Measure cold navigation
and retained-cache reload separately; preserve complete text and count errors.
These lab samples are not real-user percentiles. Three pre-change production
pairs measured cold median 9.67 s (9.52–11.67) and reload median 4.04 s (3.94–6.62),
with all six completing and zero page errors, workers or layout shift.

## Font delivery follow-up

Earlier reveal exposed late Google Fonts swaps: one trace took 2.1 seconds for
the external stylesheet and another 2.1–2.6 seconds for Newsreader/Geist Mono.
The completed summary then changed size/position. The reader now serves the
byte-identical font files locally, preserves all nine Unicode subsets and ships
the original OFL licenses. Only the two Latin files (155,128 bytes total, already
used by the old reader) are preloaded. Families, weights and theme tokens stay
the same; optional accessibility/symbol fonts keep their existing loading.

The nine font-face declarations add 651 gzip CSS bytes; the initial-CSS cap
increases by 1,000 bytes to 54,000. Startup and aggregate CSS caps stay unchanged.
The early-loading browser regression blocks both external font origins and
requires the normal reader fonts to be loaded. The layout regression still
requires stable summary, transit and card geometry from the first visible frame.

## Scheduling correction after stress measurement

The first preview started the large canonical JSON during App download. Five
slow-mobile pairs showed that this competed for bandwidth and delayed the shell,
leaving cold reading time close to baseline. That schedule was rejected. The
final schedule starts only facts/publications before App; JSON starts alongside
the placement module once App is available. The release PR records the final
comparison rather than claiming the rejected preview as an improvement.
