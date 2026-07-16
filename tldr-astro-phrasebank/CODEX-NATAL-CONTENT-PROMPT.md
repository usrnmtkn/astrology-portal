# Codex — put the real natal writing on the Natal placement + aspect pages

The Natal detail pages (e.g. "Sun in Aquarius in the 9th house") render thin, sometimes wrong copy,
duplicate the same topic several times, and show "a fuller interpretation is not available yet" for
aspects. The wiring is already fixed on your side; what's left is the **content**, which is now ready.

## Background (already done, for context)
- You ungated `sourceGroundedNatalAspectComposition` (it no longer returns null behind
  `legacyPublicLiveWritingEnabled`).
- You rewired `sourceGroundedRuntime.ts` so a READY natal-placement key uses `composeNatalPlacement(...)`
  before falling through to V2/scaffold.

So both surfaces now render from the source-grounded record store
(`apps/web/src/content/finalSourceGroundedDashboardRecords.json`). The problem is that store's records
are stale/partial and their clauses are thin and `review_status: "draft"`:
- Aspect pages: 154 of 214 pairs present; all four Sun aspects on the sample page are missing → they
  fall to the placeholder. Present ones are composed by lowercasing+truncating raw texture.
- Placement pages: the text is thin and sometimes wrong — `dashboard.natal-placement.sun.aquarius.house_9`
  `core_behavior` pulled Aquarius *season* new-moon copy ("aquarius season begins with a bang…").
- Every clause is `review_status: "draft"`, so `hasEligibleReviewedRecord()` rejects them anyway.

## The content is ready
`tldr-astro-phrasebank/phrasebank/cc-natal-source-grounded-bundle.json` (built by
`tests/build_natal_source_grounded_bundle.py`, wired into `build_all.sh`) contains **1,988** records in
the **exact `finalSourceGroundedDashboardRecords.json` schema**, carrying our real reviewed writing:

- **428 natal-aspect** records (both directions of all 214 pairs) from `cc-natal-aspect` — the real
  `experience` + `guidance` (e.g. Sun conjunct Mercury: "The way you think and the person you are speak
  with one voice…"). `templates.expanded = "{{experience}} {{guidance}}"`.
- **1,560 natal-placement** records (120 sign-only base + 1,440 sign×house) from
  `cc-planet-in-sign-reviewed` (`natal_sign_story` → `core_behavior`) and `cc-planet-in-house-reviewed`
  (`house_integration` → `house_synthesis`). `templates.expanded = "{{core_behavior}} {{house_synthesis}}"`.

Every record is `validation.state: "READY"`, every clause is `review_status: "reviewed"`, with both
`text_you` (reader's own chart) and `text_they` (friend/other chart, pronoun-shifted), and `source_keys`
that start with `cc/`.

## Tasks
1. **Merge `cc-natal-source-grounded-bundle.json` `records` into
   `apps/web/src/content/finalSourceGroundedDashboardRecords.json` by `canonicalKey`** — replace the
   existing thin natal-aspect / natal-placement records with these. Keep any families we don't touch
   (e.g. `personalized-transit`) as-is.
2. **Make the merge durable.** `scripts/materialize-final-source-grounded-package.mjs` regenerates that
   file from the `/tmp` handoff package and would clobber this. Either have the materialize step consume
   this bundle for the natal-aspect/natal-placement families, or apply this as a post-materialize
   overlay. Don't leave it as a one-off hand-merge that the next materialize run wipes.
3. **De-duplicate the placement page.** It currently stacks four layers for one placement — the scaffold
   paragraphs, the short one-line modules, the "What supports / makes this harder" madlib aspect block,
   and the "NATAL ASPECTS TO SUN" list. Now that source-grounded serves, render **one section per
   topic**: the `composeNatalPlacement` sections (sign + house), then the natal aspects from the
   source-grounded records (`experience` + `guidance`). Drop the scaffold/short-module duplicates and the
   madlib "What supports/harder" block entirely.
4. **Verify** on `Sun in Aquarius in the 9th house`: the placement renders our sign + house text (not
   "aquarius season begins with a bang"), and the four aspects (Sun conj Mercury, Sun sextile Neptune,
   Sun square Uranus, Sun trine Pluto) render our `experience` + `guidance` instead of "not available yet."

## Notes
- **Placement bodies are concise** — our reviewed `natal_sign_story` + `house_integration` (two clean
  sentences), which is accurate and de-duplicated but shorter than the hand-written exemplars in
  `source-derived-clause-exemplars.json`. If Marie wants richer per-placement prose, that's a separate
  authoring pass; flag it, don't synthesize.
- Everything is **DRAFT** pending Marie's editorial sign-off (reviewed-tier, not prod-LIVE). `review_status`
  is `reviewed` so the runtime's eligibility check passes; the prod gate stays separate. Serve verbatim —
  no runtime re-compose.
