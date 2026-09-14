# Sky publication hydration and CI recovery

## Reproduction and correction

A fresh guest browser on production main `b259099352e1f73eeac0b3a90528bb661be213bf`
observed two complete Sun-in-Virgo article variants on the first visit. Navigation
back also selected different prose. The placement loader now resolves the
publication ledger, bundled renderer, and both Studio overlays before painting
an article. Article identity and selected prose commit together. Ordinary clock
and background updates retain the verified article; publication changes replace
it, retirement removes it, and failed authoritative reads offer retry.
Canonical publications cannot fall through to older legacy prose.

Sky summary follows the same publication-readiness boundary and preserves the
verified paragraph through ordinary refresh. No competing prose cache is added.
No owner writing, approvals, source distribution state, or accuracy thresholds
change. The failed-chunk recovery boundary also lets a child route own its error
so navigation remains usable; stale entry assets retain one guarded recovery.

## Verification evidence

The READY preview for `8e88eb86f` passed all eight placement visits: cold cache,
reload, navigation return, and 65-second background refresh at 1440 and 390 px.
Every visit retained one complete prose variant with no collapsed card. All five
real-data summary visits passed with no page errors. Access used the existing
project automation credential scoped only to that exact preview hostname.

- Nine isolated cold-load, revision replacement, retirement and retry cases passed.
- Thirty summary/clock/layout cases and 32 integrated reader cases passed,
  including current main's article phrase variables and exact protected copy.
- The current Studio matrix passed 275 cases together and six corrected row-style
  assertions separately. All four corresponding CI shards passed on `6a8ee9e71`.
- Complete Content Studio API contracts passed locally and in CI on that head,
  then locally again with main through #802 integrated. The contracts exercise
  actual handler saves, publication, retirement, stale writes and empty-house preview.
- The current loading, visual baseline and smoke suite passed all 25 cases locally.
  Linux reference capture on `89bcac5bc` matched all existing images byte-for-byte.
  Four stale macOS reference images were visually reviewed and updated to current
  main's Studio styles and existing Sky summary grammar; pixel tolerance is unchanged.

Main releases #799–#804 are integrated, including phrase variables, Calendar
Moon-sign editing, shared You account state and article draft-save corrections.
The downstream client run passed 215 cases; three intermittent Friends article
openings each passed three isolated serial repeats without a code change.
The 25-case summary Studio run passed 23 cases, with the two remaining cases
passing after the final correction: unsaved/saved reader-status vocabulary and
rejecting an impossible calendar lunation while retaining valid current Sky facts.
A failed calculation still requires Retry; a disproven event is omitted.

Final-head CI and the merged production deployment remain release gates.
The final PR report records those outcomes separately from these earlier checks.

## CI repairs and budgets

The mandatory Content Studio API workflow runs on every PR/main update. YAML
conditions containing `#` no longer become truncated scalars, and merge commits
are checked. Conservative path selection includes shared dependencies and removed
files. The complete Studio suite runs in four isolated shards. CSS-importing Node
tests use Vite's module loader. Browser fixtures selecting bundled content resolve
an explicit empty publication ledger and isolate the nightly fallback snapshot.
Editor tests distinguish calculated facts from the new editable phrase panel and
open the same article disclosures a user opens before inserting variables.

The empty-house preview uses the existing authenticated read-only endpoint rather
than downloading the whole reader engine. Serving-status keys are generated from
the canonical manifest; approval records stay in that manifest. Web compression
uses the safe Terser options already used by standalone Studio. The only added
web allowance is 500 bytes for the graph route's shared Studio CSS: main #799
moved approved styles into that file, now 23,126 gzip bytes against a 23,300 cap.
At this checkpoint, reader startup, web JavaScript and accuracy limits remained
unchanged; the later main #806–#809 integration is measured separately below.
The combined #801–#803 Studio features and accessible serving-status badge
measure about 178.55 kB entry and 452.13 kB total gzip with the actual CI
Supabase configuration. Studio receives 250 bytes entry and 500 bytes aggregate
above main’s allocations; raw/chunk/graph boundaries remain unchanged.
The attempted extra compression passes, function hoisting, alternate quotation
and badge restructuring were discarded; they did not justify changing runtime
code or compiler settings for this small integrated feature allocation.

## Final integrated preview and CI scheduling

Main through #805 is integrated. The exact `8f718baa6` preview passed all eight
desktop/mobile placement visits and all five summary visits, with no prose
replacement, card collapse, or page errors. Its CI passed all four Studio shards,
the mandatory API contract, all 32 Sky reader cases, and 24 of 25 summary Studio
cases. The remaining retirement fixture left Calendar unmocked: the preview
returned 404 and invoked unrelated worker calculation before its five-second
assertion. An explicit empty Calendar fixture preserves the retirement,
unavailable-copy, Retry, and no-legacy-copy assertions. Five consecutive fresh
build repetitions passed in under a second each, without widening timeouts.

The serialized placement job exceeded its 30-minute runner limit while the
long client flow suite continued separately. Its final log also exposed an old
single-node heading selector: Sky now groups the North/South Node axis. All
four corrected parity cases pass, comparing the complete two-paragraph North
Node fixture between Sky and You and retaining the paired South Node passage.
The fixture now isolates the publication ledger and nightly snapshot as well.
Placement reader verification now
has its own job, retaining the original seven-file command. The complete client
suite uses four isolated shards with one worker each, matching the existing
Studio sharding model. Test collection proves all 219 cases occur exactly once
across shards of 55, 55, 55, and 54, with no omissions or duplicates. Per-test
timeouts, retries, assertions, and calculation thresholds are unchanged. All
38 workflow YAML files and conservative changed-path regressions pass.

The original client-flow job also exceeded its 45-minute limit. Its failures
identified a real initial hydration race: an empty dashboard overlay arriving
after a Friends article opened invalidated that article even though no source
changed. A controlled late-response regression fails before the correction.
The reader now distinguishes an empty initial overlay from removal of an
installed overlay; article revision bookkeeping stores the revision without a
redundant route string. The regression plus all 80 canonical Friends openings
pass. Four publication scenarios also verify that retirement removes the open
published passage. The two You macro tests now expand main #804's Read more
control before asserting the complete final sentence. Seven focused runtime
regressions and type checking pass; authored source data remains unchanged.

## Existing full-suite and reference limitations

`npm test` stops at `scripts/test-natal-exact-copy-routing.mjs:49`: historical
metadata checksum expected `087d8486…`, actual `7469bac8…`. This same failure is
documented in `docs/qa/sky-summary-event-grammar-2026-09-10.md`. The 231 protected
rows and projected fields are unchanged from `71f256d28` and current main.
The checksum and protected source inputs are not rebaselined. This is not a
passing full content suite.

The completed NASA/JPL comparison in Actions run `34760840299` reported zero
discrepancies and 377 reference gaps across 12 fixtures under the existing partial
reference policy. The dependent freshness gate passed. No accuracy threshold
was loosened; the run does not establish complete reference coverage.

## Live verification commands

After the exact merged main deployment is READY, run both public guest checks:

```sh
node scripts/verify-production-sky-placement.mjs
node scripts/verify-production-sky-summary.mjs
```

The placement script delays original content reads without modifying responses,
records all full-prose mutations and samples card height. Both scripts use fresh
guest contexts and write visit reports plus screenshots under `test-results/`.
Deployment completion alone is insufficient; both live browser reports must pass.

## Concurrent main integration

Main through #809 is retained, including Calendar Sun/Moon reading and Account
session recovery. Both branches independently chose the same admin limits;
the merge retains both rationales without adding the allowances together.
The initial-empty-overlay fix uses concise developer diagnostics; no visible
copy changes. Reader broadcast and periodic revalidation share the same cache
refresh callback, now reflected in the source contract.

The hydration/Friends repair passed the 474,750-byte reader startup cap before
this integration. With the same CI configuration and compiler, the newly merged
Calendar/Account features bring the combined build to 475,143 gzip bytes, 393
over that cap. A 500-byte allocation covers those features (new cap 475,250).
App JavaScript, startup CSS, aggregate and individual deferred-chunk limits,
accuracy thresholds and all behavioral assertions remain unchanged.

The new main #806 Calendar full-Moon reading initially selected the old weekly
paragraph in the local release build. Its intended full passage is in the Sky
placement partition, while Calendar waited only for the older deferred bundle.
Calendar now loads both existing dependencies before its first body render;
no new source, cache, wording or publication state is introduced. Eight
viewport/theme/data cases verify the complete intended paragraphs. A delayed
partition and DOM observer also assert that no other Moon passage paints first.
These eight tests join the existing placement reader job. Calendar package
boundaries, type checking and the integrated web budget remain passing.

## Final integration regressions

The `30c78c91d` real-data preview passed all eight placement visits and all five
summary visits, including both 65-second background checks, with one prose
variant, no collapse and no page errors. Its mandatory API contract passed
locally and in GitHub; all 27 retained Account recovery cases passed locally.
The complete client matrix exposed only two outdated fixtures: Day now selects
the complete Moon placement passage while Week retains consecutive variants;
and the sign-out case supplied a cached profile without a verified session.
The revised tests preserve complete-text comparisons and seed an actual synthetic
Supabase session, then require the logout request and cleared reader state.
Both pass. Three loading cases similarly retain their waiting/offline assertions
while selecting the current full Moon passage for Day/selected Week cards.

The new Calendar editor links were outside a Studio container. They now sit
inside the existing toolbar; all four unchanged full-page/form container audits
pass, with the seven Calendar loading checks and five related Studio cases
(16 total). No blanket exclusion, wider timeout or snapshot rebaseline was used.

Main #807 landed during the final check and conflicted in `openSkyDetail` and
Calendar placement snapshot selection, preventing GitHub's PR workflows from
starting. The resolution retains its timezone-aware date ranges, complete
aspect timelines, recalculation when reopening a card, and calculated ingress
exit. It also retains the hydration barrier: no partial article renders before
its publication sources resolve. Its date/timeline browser tests join the
placement reader job. The integrated startup now measures 475,313 gzip bytes,
63 over the preceding cap; a 250-byte feature allocation covers #807 (475,500
new cap). Other budgets and accuracy thresholds remain unchanged. Upstream's
approved Calendar source routing and metadata updates are preserved verbatim.
