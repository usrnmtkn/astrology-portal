# Codex task: serve the authored phrasebank content VERBATIM. Delete the legacy composers.

## The problem (root cause, stated once)
Detail pages are rendering **app-generated scaffold copy**, not the authored phrasebank fields. There
is a composer in the web app that stitches vocab fragments into strings like
`"{point} … through {sign-adjectives} conditions …"`. It overrides the authored content and breaks
grammar. The authored content is already clean and already imported. **Your job is to make every
detail page print the authored field byte-for-byte and to delete the composer that generates the
scaffold.** Do not paraphrase, reflow, re-punctuate, or re-compose the authored text.

## Proof it is app-generated, not data
None of these on-screen strings exist anywhere in the phrasebank (grep the zip — 0 hits):
- "brings {topic} through {sign} conditions" / "core ways of choosing, reacting, and responding"
- "coloring the current sky with … conditions" / "becomes easier to notice in this sign's pace and priorities"
- "so this angle meets life through … conditions" / "how the world gets met becomes visible in the chart"
They are produced in app code. Find and remove that code.

## Step 0 — TWO possible causes; handle both
The scaffold text can come from either place. Check and fix both:
- **(a) An app composer** generating the string at render time (Step 1).
- **(b) A legacy row already LIVE in Supabase** on the same key (e.g. `natal.angle.ascendant.gemini`)
  that outranks my authored row on precedence. My authored rows are in `cc-natal-angles-authored`,
  `cc-planet-in-sign-reviewed`, etc. Query `generated_interpretations` for existing rows on these keys
  whose body contains "meets life through" / "coloring the current sky" / "brings … through … conditions"
  and **archive them**, then make the authored row the LIVE served row for that key. Verify:
```
select content_key, status, left(generated_body,80) from generated_interpretations
where generated_body ilike '%through%conditions%' or generated_body ilike '%meets life through%'
   or generated_body ilike '%coloring the current sky%';
```
  Every hit is legacy — archive it. The authored row (from the zip) must be the LIVE row.

## Step 1 — find and delete the composer(s)
Search the web app for the generators and remove them (or hard-bypass them for these surfaces):
```
grep -rn "through .*conditions\|coloring the current sky\|meets life through\|becomes easier to notice\|core ways of choosing\|brings .*through" apps/web/src
grep -rn "planetTopic\|signAdjectives\|angleTopic\|emergencyPointFunction\|composePlacement\|composeSkyPlacement\|composeAngle" apps/web/src
```
Any function that concatenates planet-topic / sign-adjective / angle-topic vocab into a sentence for
placement, sky-placement, or angle surfaces must be deleted. These surfaces have finished authored text.

## Step 2 — serve the authored field verbatim, per surface
Use `cc-served-fields.json` (the contract) and `APP-RENDER-SPEC.md`. For each surface, the body is the
named field, printed exactly:

| Surface | Row source (key) | Field to print VERBATIM |
|---|---|---|
| Natal placement — sign | `cc-planet-in-sign-reviewed` | `natal_sign_story` |
| Natal placement — house | `cc-planet-in-house-reviewed` | `house_integration` |
| Sky placement / season | `cc-planet-in-sign-reviewed` | `collective_shift` |
| Planetary horoscope | `cc-planet-in-house-reviewed` | `home_scene` |
| Natal angle | `cc-natal-angles-authored` | `reading` |
| Sky point (Chiron/Lilith/Nodes) | `cc-sky-points-authored` | `collective_reading` |
| Natal aspect | `cc-natal-aspect` | `experience` (+ `guidance`, `note`) |
| Transit / sky aspect | `cc-aspect-pair-reviewed` → then `cc-natal-aspect` | `expanded_narrative` → `experience` |
| Transit through house | `transit/planet-through-house` | whole body |
| Retrograde / ingress / station | `transit/retrograde`, `transit/ingress` | whole body |
| Composite | `cc-composite-typed` | `meaning`, `experience`, `advice` |

Framing allowed: the H1 title and eyebrow (built from the computed chart) and a section label. The
paragraph text must be the field, unedited. Never render any `internal_blacklist` field.

## Step 3 — serving precedence (no composition, ever, on these surfaces)
1. Look up the exact authored row by key. If found, print its field verbatim. STOP.
2. If the specific row is missing, use the documented fallback chain (aspects: expanded_narrative →
   cc-natal-aspect.experience; placements compose the two authored kernels sign + house, each verbatim).
3. Only if all authored sources miss, use the mustache template. This should effectively never happen.
There is no path where a vocab-composed sentence is served for these surfaces.

## Step 3.5 — this is a COVERAGE problem, not a 3-fixture problem
Previous passes fixed only the sample keys I gave (venus, ascendant, mars) and left every other
placement on a stub. Do NOT fix per-fixture. Fix the general path so **all 240 placements** serve the
authored field, and prove it across the whole set — not 3 examples.

- Confirm all authored rows are imported LIVE: `cc-planet-in-sign-reviewed` (120 `natal_sign_story`) +
  `cc-planet-in-house-reviewed` (120 `house_integration`). Query the row count in Supabase; it must be
  120 + 120 LIVE on the placement keys. If any are missing/DRAFT, that is why the stub shows.
- The stub string **"Use the reviewed placement bank for the full reading"** (and "Use the calculated
  angle …") is a placeholder that must NEVER render. Find where the app emits it and remove that path —
  it should serve the authored field instead.

## Step 4 — hard acceptance test: COVERAGE over ALL placements (not 3 fixtures)
Render **every** natal placement route (all 10 planets × their sign × house = the user's whole chart,
and ideally all 120 sign + 120 house combos) and assert two things for each:
1. the rendered body **contains** the authored `natal_sign_story` and `house_integration` for that key;
2. the rendered body does **NOT** contain any of these composer/stub signatures:
   `"brings"` (my authored placement/angle fields never use this word — it is the composer's verb),
   `"reviewed placement bank"`, `"Use the calculated"`, `"through"`+`"conditions"`,
   `"into"`+`"expression"`, `"coloring the current sky"`, `"meets life through"`, `"core ways of choosing"`.
   Confirmed live this run: `#you/placement/moon-scorpio-6h` currently renders "Your Moon in Scorpio
   BRINGS emotions, instincts, and what brings safety INTO intense, private, all-or-nothing EXPRESSION."
   — that is the composer, still active. It must instead render the authored `natal_sign_story`
   "Your feelings run deep and private, and you don't do shallow reassurance" + the `house_integration`.
If ANY placement route fails either check, FAIL the build. A test that only checks 3 keys is not
acceptable — the loop we are breaking is exactly "fixed the 3 I was given, left the rest."

Then spot-check these specific ones as named fixtures:
```
#you/placement/venus-capricorn-8h  body must equal cc-planet-in-sign-reviewed[venus-in-capricorn].natal_sign_story
                                   + cc-planet-in-house-reviewed[venus-in-8th-house].house_integration
#sky/placement/mars                body must equal cc-planet-in-sign-reviewed[mars-in-gemini].collective_shift
                                     = "Our action scatters into talk and errands, and we're all busy and a little scattered"
#you/placement/ascendant-gemini-1h body must equal cc-natal-angles-authored[ascendant-in-gemini].reading
                                     = "You come across curious, verbal, and quick, and people register your wit before you say a word. …"
```
Assertion: `renderedBody === authoredField` (trim only). If the rendered body contains "conditions",
"coloring the current sky", "meets life through", or "brings … through", FAIL. Add this to CI.

## Step 5 — verify and report
- Run the assertion test above (must pass for all three fixtures).
- `npm run typecheck --workspace @tldr/web` and `npm run build:web`.
- Reload the three routes and confirm the body matches the authored field exactly.
- Report: the composer functions you deleted (file + line), and the three rendered bodies.

Do not close this out until `renderedBody === authoredField` for all three fixtures and the composer
grep from Step 1 returns zero results in serving paths.
