# Codex handoff: aspect patterns v3 (mechanic + synthesis resolver)

Two-level, you-voice pattern copy where each pattern is a chart-independent MECHANIC
filled by RESOLVED CLAUSES synthesized from planet + sign + house + geometry-role.
No stored per-chart bodies; no example-specific reasoning inside templates.

## 0. Canonical sources
```
Canonical copy: aspect-pattern-templates-v3.3.md   (all six, fully generalized,
  complete confidence branches, single namespace, house-aware, unknown-time L1+L2)
Historical reference only (DO NOT implement copy or schema from these):
  aspect-pattern-canonical-spec-v2.md, aspect-pattern-model-v3-tsquare.md,
  aspect-pattern-model-v3-part2.md, aspect-pattern-templates-v3.1.md,
  aspect-pattern-templates-v3.2.md
```

## 0b. Eligible bodies (LOCKED)
PRIMARY detector (creates/suppresses patterns): Sun, Moon, Mercury, Venus, Mars,
Jupiter, Saturn, Uranus, Neptune, Pluto = 10 bodies. focal-demand-by-planet and
apex-pressure-by-planet tables = 10 rows each.
SECONDARY / optional: Chiron may appear as a participant ("Chiron participates in
this pattern") or via an expanded-pattern setting, but must NOT create or suppress a
primary Grand Cross, Kite, or Yod in v1. Chiron gets its own table row only when the
secondary-participation behavior is designed.
EXCLUDED: nodes and angles (points, not bodies; no focal_demand / apex_pressure grammar).

## 1. Locked schema
```
pattern_definition: pattern_key, participant_count, geometry, focal_role?,
  apex_role?, open_point?, contained_pattern_rules
resolved_instance:
  participants[]: planet, sign, house?, geometry_role
  opposition_pairs[], apex_planet?, focal_planet?, empty_leg_sign?,
    empty_leg_house?, balancing_point_sign?, balancing_point_house?,
    max_orb, confidence, birth_time_confidence
resolved_clauses:   # resolver OUTPUTS, assembled from participant fields - not stored natal text
  per participant: role_gloss, house_label, house_area, house_context,
    sign_house_pull, sign_house_response, sign_pull, sign_behavior
  apex extra (T-square): response_example, pressure_response  # REQUIRED for a
    resolved T-square apex (used in shows_up / complicated). If the source layer
    cannot produce both, FAIL validation rather than drop a required section.
  focal: focal_demand, focal_interruption            # Kite - BOTH REQUIRED; fail
    validation if unavailable (templates cannot render feel/shows_up/complicated without them)
  apex: apex_pressure, repeating_question            # Yod - BOTH REQUIRED; fail
    validation if unavailable (same reason)
  reference: reference_behavior, reference_area       # Yod / balancing points
  opposition: area                                    # Grand Cross / Mystic Rectangle
  empty_leg: balancing_move
level_1: title_by_confidence, opening_by_confidence, feel, shows_up, complicated,
  another_response?, reading_note_by_confidence
level_2: title_by_confidence, opening_by_confidence, how_it_works, planet_roles,
  watch_for, reference_point?, reading_note_by_confidence
overrides: partial_pattern, wide_pattern, out_of_sign, unknown_birth_time,
  moon_time_uncertainty, missing_derived_point, contained_pattern
```

## 2. Resolved-clause interface (define before building copy)

These are grammatical fragments the templates drop in, produced by the resolver from
raw fields. Each has a fixed syntactic slot and a source. If a clause cannot be
produced, drop the sentence/section rather than emit a placeholder.

```
role_gloss          2-4 word planet function ("what you're driving toward").
                    SOURCE: planet-function table (10 primary rows, +optional Chiron; = the unknown-time
                    lived-roles list). Fixed.
house_label         "the 4th house".  SOURCE: house number.
house_area          noun phrase "home, family, and privacy". SOURCE: house-topic layer.
house_context       prepositional "at home, with family, or around where you live".
                    SOURCE: house-context layer (new 12-row table or derived).
sign_house_pull     verb phrase completing "Your {planet} in {house_label} ___"
                    ("wants room to act from your own center"). SOURCE: planet-in-sign
                    behavior layer + house_context. Non-action (opposition-end / trine).
sign_house_response verb phrase completing "{planet} in {house_label} ___"
                    ("protects its privacy before explaining what went wrong"). The
                    response form for apex / focal; SAME grammatical frame as sign_house_pull.
response_example    short clause for shows_up ("often by protecting your space").
pressure_response   short clause for complicated ("retreat, guard the people you love").
balancing_move      empty-leg response by empty_leg SIGN ("name the limit out loud...").
                    SOURCE: sign layer (the sign's core need/response).
focal_demand        what the Kite focal introduces ("a standard, a delay, or a fact
                    the momentum has to answer"). SOURCE: focal-demand-by-planet table
                    (NEW, 10 rows; +1 if Chiron is enabled as secondary), refined by sign/house.
focal_interruption  the lived event where the focal interrupts ("questions, deadlines,
                    and repeated effort"). SOURCE: focal planet + SIGN + house.
apex_pressure       what the Yod apex adds ("consequences that are harder to smooth
                    over"). SOURCE: apex-pressure-by-planet table (10 primary rows;
                    optional Chiron only after secondary participation is designed) + SIGN + house.
repeating_question  the concrete returning question ("can you keep paying for,
                    promising, or carrying this..."). SOURCE: apex planet + SIGN + house.
reference_behavior  what the balancing SIGN points to ("the body, budget, comfort, and
                    plain routine" for Taurus; "information, a conversation, or a smaller
                    next decision" for Gemini). SOURCE: sign layer, per reference sign.
opposition.area     lived area of an opposition ("a conflict about money and trust").
                    SOURCE: the two planets + their houses.
sign_pull/sign_behavior  HOUSE-FREE variants of sign_house_pull/sign_house_response
                    for unknown birth time. SOURCE: planet-in-sign layer only.
```
Namespace is single and role-based (matches the templates file): apex.planet,
focal.planet (+ focal.opposes), empty_leg.{sign,house_label,house_area,balancing_move},
reference.{sign,house_label,area,behavior}; members c1..c4 / t1..t3 / base1,base2 /
oppA,oppB / oa1,oa2,ob1,ob2. Always use the dotted form (apex.planet); never an
underscore alias such as apex-underscore-planet.
Each pattern has AUTHORED `unknown_time L1` AND `unknown_time L2` bodies (house-free,
sign-resolved) in the templates file - use them rather than dropping house sentences
one by one.

Authored base tables now live in `aspect-pattern-templates-v3.3.md`:
focal-demand-by-planet (Kite) and apex-pressure-by-planet (Yod), with 10 primary
rows each. Everything else reuses existing layers (planet-function, planet-in-sign
behavior, house-topic, sign core-need).

Canonical planet-in-sign behavior source (CONFIRMED): the V3
`fallback-hook/placement-sentence/{planet}/{sign}` rows in
`apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json`,
read through `fallbackV3PlacementSentence` in
`apps/web/src/content/fallbackArchitectureV3Runtime.ts`. A missing hook is a
SOURCE_GAP; do not substitute generic planet-in-sign copy.

LABEL-BLIND ACCEPTANCE TEST (run once PER PARTICIPANT ROLE, not once per pattern):
for each role a pattern uses (every trine member, opposition end, apex, focal, base),
(1) hold planet, house, geometry role, and all other inputs fixed; (2) change ONLY
that role's sign; (3) render both versions; (4) strip explicit sign names; (5) confirm
the remaining body copy differs. If it does not, that role's clause is still sign-blind
(e.g. a Kite must pass on t1, t2, t3 AND focal, not just focal).

## 3. Participant ordering (deterministic - assign the c1/t1/oa1 labels)
```
Grand Cross: sort participants by zodiac longitude, assign c1-c4 in order;
  oppositions are c1-c3 and c2-c4.
Grand Trine: sort t1-t3 by longitude.
Kite: focal = the body outside the Grand Trine; focal.opposes = the trine member it
  opposes; remaining two trine planets t1,t2 sorted by longitude.
Yod: apex = the quincunx target; base1,base2 = the sextile pair, sorted by longitude.
Mystic Rectangle: opposition A = the pair with the lower starting longitude (oa1 =
  lower of that pair); opposition B the other; order each pair consistently.
```
Same chart must always produce the same pairings.

## 4. Confidence (authored slots; partial has its own body)
- exact: canonical mechanics.
- strong: uses the exact title and opening VERBATIM; the ONLY change is the reading
  note (Close -> Clear). No separate strong copy; the exact openings already hedge
  with "tends to"/"can".
- wide: use the AUTHORED wide title + wide opening per pattern (do not have Codex
  write the softened sentence); canonical body otherwise.
- partial: render the partial TITLE + the pattern's `Partial` block ONLY (the short
  body, both levels). Do NOT also render an exact/wide opening or the full
  how_it_works / planet_roles / watch_for for partial - the Partial block IS the whole
  partial page, so there is no double intro.
- Each rendered level has its own confidence title/opening/note. Level 2 softens the
  MECHANICAL claim; Level 1 softens the experience.
- Reading notes: Close/Clear/Wider/Partial + "The widest link is {max_orb} degree(s)"
  (singular "degree" only when max_orb rounds to 1).

## 5. Overrides
- out_of_sign: swap how_it_works for the out-of-sign clause (given for Grand Trine;
  apply to any pattern whose default claims a shared element/style).
- unknown_birth_time: render the authored `unknown_time L1` and `unknown_time L2`
  bodies per pattern (house-free, sign-resolved via sign_pull/sign_behavior + role_gloss);
  never mention houses, angles, rising sign, or chart ruler. Do not improvise replacement prose.
- moon_time_uncertainty (distinct from missing houses): when the Moon participates,
  test it across the full birth window. USER-FACING: withhold the pattern when it only
  qualifies during part of the window. DIAGNOSTICS/ADMIN: retain an uncertain detection
  record with the qualifying time range. Never serve it as confirmed-minus-houses.
- missing_derived_point: drop another_response / reference_point rather than invent one.
- apex/focal reassignment: apex.planet / focal.planet and role headings are tokens
  (single dotted namespace; no underscore aliases).

## 6. Contained-pattern precedence (confidence-aware)
```
An exact or strong containing pattern suppresses its contained patterns
  (Kite suppresses its Grand Trine; Grand Cross suppresses constituent T-squares).
A wide or partial containing pattern does NOT suppress an EXACT contained pattern:
  serve the exact contained pattern as primary and mark the larger figure as
  possible/wider.
Otherwise the larger/more-specific figure wins; contained figures are referenced,
not re-served as independent discoveries.
```

## 7. Naming/grammar lock
"Grand Cross" everywhere (never "Grand Square"); singular "1 degree"; no writer-facing
instructions in user copy; PATTERN NAMES (T-square, Grand Trine, etc.) may appear at
Level 1, but technical mechanics (opposition, square, quincunx, apex, empty leg)
belong on Level 2 only; no "ask/asking" agency, no
vague "things", plain over polished-astro. lint-sky-voice stays active (you + inline
references allowed on this surface; em-dash, banned-word, conditional-"steady" checks on).

## 8. Executable gate (FROZEN interface)
Canonical home is this directory (packages/astro-knowledge/). The contract is
machine-checked, not reviewed by eye. One shared contract + three scripts travel
with the templates; ALL must pass, run from a clean directory containing only these
six files (so no older same-named copy can be picked up):
- `aspect-pattern-contract.json` - SINGLE source of truth (token registry, per-
  pattern required-by-section clauses, eligible bodies, banned lists). The template's
  human TOKEN REGISTRY must match it, or the validator errors.
- `validate_patterns.py` - reads the contract; checks tokens BIDIRECTIONALLY
  (used-but-undeclared AND declared-but-unused), required tokens by EXACT section,
  required sections present, confidence/override branches, geometry-at-L2,
  unknown-time-has-no-houses, banned words, namespace purity; prints resolved paths.
  Must print "VALIDATOR: PASS (0 errors)".
- `render_matrix.py` - per-ROLE label-blind (sign) + house-blind audits on EVERY
  surface (known L1/L2, unknown L1/L2) + confidence-branch structural checks.
  Must print "RENDER MATRIX: PASS".
- `gold_render.py` - fills tokens with natural English; checks resolved cards for
  grammar defects (unresolved braces, doubled prepositions, space-before-punctuation,
  fragments, empty sections) across exact/wide/partial/unknown + out-of-sign.
  Must print "GOLD RENDER: PASS".
Resolver-policy branches (moon_time_uncertainty, contained-pattern precedence,
missing_derived_point, Chiron-secondary) are asserted present in THIS handoff by the
validator. FROZEN: once all three pass from the clean directory, table authoring may
change only the VALUES supplied to existing tokens - never add, rename, or
re-contract a token. Re-run all three after any edit. A later issue is either a
token-value problem (fix the table value) or a renderer bug (fix resolution) - never
a template redesign, unless a real chart proves the contract cannot express a meaning.

## 9. Build order + report
1. Owner-review and lock the two drafted tables (focal-demand-by-planet,
   apex-pressure-by-planet, 10 rows each). The canonical planet-in-sign source is
   confirmed above.
2. Implement resolved_clauses; then the six mechanic templates + partial bodies +
   confidence slots + overrides from the templates file.
3. Participant ordering; confidence-aware precedence.
4. Run validate_patterns.py + render_matrix.py to zero errors; lint every rendered card.
5. Report: validator + render-matrix output, and one final rendered card PER PATTERN
   at exact + wide + partial (known and unknown time) for owner approval.
```
