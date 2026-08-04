# TLDR Astro fallback architecture v3

Created: 2026-07-21
Supersedes: fragment-concatenation fallback in `finalSourceGroundedDashboardRecords.json` (`{{core_behavior}} {{house_synthesis}}`) and the thin `fallback-hook/you.natal-placement` bodies.
Compatible with: `templateHandoffV2/contracts/SOURCE-TIER-CONTRACT.md` (this document extends it to dashboard rows; it does not replace the provenance firewall).

## 1. The two-layer rule

Every reader surface resolves content in exactly two layers:

1. **Authored** — an approved `full_copy` record written and reviewed for a specific surface and a specific combination (e.g. `natal-mars-in-aries-house-6` on the You page). Renders verbatim.
2. **Fallback** — generated at render time from an approved **template** for that surface, filled with approved **vocabulary**, **fallback_hook**, and slot values derived from **fallback_source** rows. Used only when no authored record exists for the exact combination.

If neither layer can produce a complete, grammatical paragraph, the surface returns `SOURCE_GAP` (or the surface's designated emergency copy). Nothing in between: no keyword dumps, no fragment concatenation, no "adjacent combination" substitution.

**The rule that keeps the layers clean:** helper clauses — `core_behavior`, `house_synthesis`, `experience`, `guidance`, keywords, book extractions, phrase fragments — are *source material only*. They inform fallback generation (a human or a deterministic derivation turns them into slot values), but they never render directly as reader copy, alone or concatenated.

## 2. Content roles

Every row in the dashboard and in the content-source files carries exactly one `content_role`. The machine-readable version is `contracts/CONTENT-ROLE-CONTRACT.json`.

| content_role | What it is | Reader-facing? | Renders how |
|---|---|---|---|
| `full_copy` | Authored, reviewed prose for one surface + combination | Yes | Verbatim, layer 1 |
| `fallback_hook` | Approved, reusable *complete sentence* (grammatical on its own) | Yes | Only inserted whole into a template's sentence slot |
| `template` | Madlib structure with `{{slots}}` for one surface | Yes (when filled) | Only when every required slot resolves |
| `vocabulary` | Word/short-phrase slot filler with a declared grammar frame | Yes (inside a slot) | Only interpolated into a matching template slot |
| `fallback_source` | Ingredient material: clauses, keywords, extractions, `core_behavior`, `house_synthesis`, scaffolds | **No** | Never renders. Feeds slot derivation and human authoring only |

Consequences:

- `READY` status is only meaningful for `full_copy` and for validated rendered fallback output. A `fallback_source` row can never be `READY` — it has no reader state at all.
- The admin must display the role on every row and must visually separate reader-facing roles from `fallback_source` (see `admin/DASHBOARD-ROLE-MIGRATION.md`).
- The renderer enforces the role at runtime: a resolver that receives a `fallback_source` body as final copy must throw, not render.

## 3. Grammar-frame contract for vocabulary and slot values

The old fallback broke because person-subject fragments with conjugated verbs were concatenated ("their drive comes straight through they"). v3 removes conjugation risk from the data entirely:

- **All vocabulary and slot values are voice-neutral**: noun phrases, gerund phrases, adverbial phrases, or clauses whose subject is the placement/planet ("it", "the pattern"), never the person.
- **Only templates contain conjugated person-verbs**, with fixed subjects written into the template prose. Voice (you/they/name) is handled by `{{possessive}}` / `{{subject}}` tokens plus template-level phrasing — never by string-substituting pronouns inside stored clauses.
- Every vocabulary family declares its grammar frame (`noun_phrase`, `gerund_phrase`, `adverbial_phrase`, `it_clause`) in `CONTENT-ROLE-CONTRACT.json`, and the validator checks basic conformance (no leading conjugated person-verbs, no trailing punctuation, article agreement handled by the resolver's a/an rule).

## 4. Surface resolution order

For every surface:

```
1. exact authored full_copy record          → render verbatim
2. surface fallback template + resolved slots → render generated paragraph
3. SOURCE_GAP / surface emergency copy
```

For continuous Sky Placements, an eligible `sky-placement-continuous-v2`
article remains the preferred fallback unit. While that complete article is
unavailable, an eligible, complete `fallback-hook/sky-placement-sign/{planet}/{sign}`
row may render by itself as the placement introduction. This is a standalone
approved hook, not permission to revive the retired modular hook/lived/turn
stack. If neither unit is eligible, the resolver returns `SOURCE_GAP`.

The long-form continuous and modular Sky Placement rows are a separate
on-demand package partition. The reviewed standalone hooks remain in the eager
Sky core as the offline and chunk-error safety floor. A continuous row must be
both editorially eligible and `serving` in
`authored-inputs/sky-placement-serving-manifest-v1.json`. Moving any batch from
`staged` to `serving` requires an owner approval statement covering the exact
key diff; editorial approval alone never changes distribution.

Slot resolution order within step 2 (narrowest first, per SOURCE-TIER-CONTRACT):

```
a. placement-level row   (e.g. lived_behavior for mars/aries)   — optional, enriches
b. entity-level rows     (planet_function, sign_need, house_topic …) — required, guaranteed coverage
c. missing required slot → the template's optional block is suppressed, or if the
   slot is required → SOURCE_GAP (never a generic filler phrase)
```

Placement-level rows are optional *overrides*; the base template must render a complete, specific paragraph from entity-level rows alone. That is what guarantees full coverage without fragment output.

## 5. Natal placement surfaces (the fix this package exists for)

Natal placements render in **two parts**, each with its own fallback template:

- Part 1 — `fallback-template/natal.planet-in-sign`: planet topic (verbatim approved bank) → sign style + need (verbatim approved bank) → optional placement clauses/gerunds (verbatim CC planet-in-sign fragments) → excess and productive forms (verbatim CC planet rows).
- Part 2 — `fallback-template/natal.house-context`: renders below part 1 when a house is known; house topic + house pressure (verbatim CC house keywords). It never repeats the planet function.

The template is glue only: every slot fills with verbatim (or selection-only) wording from approved source rows, per `styleRules.sourceWordsOnly`. If no source wording exists for an optional slot, the block suppresses; nothing is paraphrased in. See `templates/fallback-templates-v3.json` for the literal bodies and `resolver/RESOLVER-SPEC.md` for assembly rules.

The old bodies ("This placement describes how {{planet}} works through {{sign}} qualities in the chart") are retired; they violate the `noMetaCopy` rule and say nothing lived.

## 6. What feeds what (provenance summary)

```
CC / Marie Satori phrase banks, book extractions      → fallback_source (never render)
        │  human review / deterministic derivation
        ▼
vocabulary rows (grammar-framed)  +  placement rows   → slot values
        ▼
fallback templates (per surface)                      → generated fallback paragraph
        ▼                                                    ▲ only when
authored full_copy (reviewed per combination)  ───────────── no full_copy exists
```

The instruction-source firewall from SOURCE-TIER-CONTRACT.md applies unchanged: prompts, chat feedback, audits, fixtures, screenshots, and raw CHANI copy can never become slot values or hooks.
