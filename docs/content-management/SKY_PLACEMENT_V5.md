# Placement composition

Current stored format: **5**. See the [Sky writing systems index](./SKY_WRITING_SYSTEMS.md)
for source history and the separate Daily Sky summary track.

V5 implements the September 10, 2026 02:43 EDT writing proposal as an opt-in
composition on the existing `sky-placement/article/{planet}/{sign}` source.
Installation does not activate proposed prose or change approved articles.
Sun, Mercury through Pluto, and Chiron use this canonical source. Moon, Lilith,
and node routes retain their specialized structures.

## Editing and preview

In Content Studio, open Sky Write-ups, select a planet and sign, and choose
**Placement composition** under **Writing path**. “Set up placement composition”
opens its source editor. “Add prefilled placement composition” creates the V5
structure and fills every library field that has a clean existing governed source.
It does not generate astrology prose and it does not enable or publish the
composition.

The placement editor opens **Writing library & placement composition** by
default. The grouped **Editable writing library** is the normal authoring path.
It keeps calculated facts separate from reusable prose and exposes the source
families an editor actually needs instead of requiring work from opaque source
IDs.

### Governed prefill

Prefill is deliberately conservative. Existing writing is never overwritten.
The editor copies current source text into an empty library field only when the
source role matches cleanly:

- `placementThesis` ← the placement's existing `tldrWhat`
- `placementPressure` and `experienceGeneral` ← existing `fallback.lived`
- `placementCorrection` ← existing `fallback.turn`
- `openingHook` ← existing `fallback.hook`
- `closingLine` ← existing `tldrTakeaway`
- `planetSummary` ← approved `fallback-vocab/planet-topic/{planet}` when available
- `planetFunction` ← left empty for the planet-in-sign sentence grammar; complete-sentence planet-function rows are not copied into this slot
- `planetProductive` ← approved `fallback-vocab/planet-productive/{planet}`
- `planetShadow` ← approved `fallback-vocab/planet-excess/{planet}`
- `signSummary` ← approved `fallback-vocab/sign-style/{sign}`
- `signCoreDrive` ← left empty for the planet-in-sign sentence grammar
- `signMethod` ← left empty for the planet-in-sign sentence grammar
- `signGift` ← approved `fallback-vocab/sign-does/{sign}`
- `signShadow` ← approved `fallback-hook/sky-sign-trap/{sign}`

A shared source explicitly marked unapproved is not copied. Optional fields with
no clean governed source remain empty rather than receiving model-written filler.
The **Fill empty fields from source library** action can be run again later; it
still refuses to overwrite local writing or an exact linked source.

### Editable writing library

The writing library is stored inside the same V5 `ingress.sources` object. It is
not another content database and does not bypass the existing publication gate.
The grouped editor exposes:

- **Planet language:** appositive, summary/lore, function, productive expression,
  shadow/excess, and collective expression.
- **Zodiac sign language:** appositive, summary/lore, core drive, method, gift,
  shadow, and values/life themes.
- **Planet × sign synthesis:** thesis, opportunity, how it shows up, shadow,
  challenge/response, practice, collective theme, and collective shadow.
- **Experience hooks:** a prefilled General manifestation plus optional work,
  money, relationships, home, body, time, recognition, and creativity hooks.
  These are stored as a bank; an experience enters the fallback only after the
  editor explicitly chooses **Include in fallback**.
- **Hooks and takeaways:** opening hook, reflection question, and closing line.
- **Optional context:** mythology, astronomy, previous-cycle context, and return
  meaning.
- **Aspect writing:** the existing defining-aspect mechanism, manifestations,
  challenge, and response sources. These remain empty until a specific aspect is
  selected and authored.

Planet and sign vocabulary is editing material with a required grammar. The
planet-in-sign fallback structure inserts those ingredients into one opening
sentence, then dignity, lived experience, the challenge, and the response.
Extra experience fields stay out of the fallback until the editor explicitly
chooses **Include in fallback**.

“Use writing library as primary fallback structure” changes the draft module
order and required modules. It does not turn on the composition, publish it, or
replace an approved serving baseline. Existing Hook / Lived / Turn fields remain
available under **Legacy evergreen sections** for audit, repair, and rollback.
No governed serving row is deleted merely because the new library is installed.

The existing **Advanced source tools** preserve custom source creation and
hash-pinned cross-placement linking for editors who need it. Each local source
shows its exact reference, such as
`sky-placement/article/saturn/aries#ingress.sources.placementThesis`.

Saved preview (Draft preview in the editor), Main template, and Assembly and
omissions use the same pure assembler as the reader. The map links sentences to
exact editor fields and explains every skipped section. Blue means calculated
facts, purple means reusable planet/sign sentences, amber means other authored
writing.

The calculated Sky variable key inserts calculated variables into the selected
sentence. Section templates also accept the names of this composition's sentence
sources. Sentences accept facts only. Named library sources such as
`{{placementThesis}}` can be used in section templates and directly in Placement
article, Direct placement article, and Retrograde placement article. They remain
authored phrase variables, not calculated facts. Nested source expansion and conditional mustache blocks are rejected.
A malformed or unknown variable reports an editor/save error; a missing
calculated value omits its dependent module without deleting words from a
sentence.

Occurrence preview calculates residency and aspects using the ephemeris worker.
It uses the selected date, or the next pass when the date is outside the sign.
The draft preview includes unsaved writing. “Open published reader for this
occurrence” opens the real reader route for the calculated date, using that
reader’s location and timezone. This avoids a second publication implementation
and keeps the reader’s content libraries out of Studio’s build. The reader may
use its last known good cache during a storage failure. Retrograde-cycle variables
remain unavailable unless the calculation supplies that complete cycle.

## Stored contract

`ingress` is an atomic version-5 object: `enabled`, `sources`, and `modules`.
A source contains `kind` and `text`, or `kind` and an exact
`reference: { contentKey, field, sha256 }`. An exact reference points to one
local sentence on an existing canonical placement source. Planet sentences can
be reused only for the same planet; sign sentences only for the same sign;
placement and timing sentences only for the same planet/sign source. References
cannot point to references. Hash mismatch, retirement, or absence makes the
reference unavailable. Relinking requires reviewing the new text. The existing
publication transaction checks required referenced writing in one batched lookup.
The reader resolves only its eligible published snapshot.

A module stores a stable ID, editorial label, template, enabled/required flags,
and motion, duration, and timing selectors. Labels are never reader prose. An
optional aspect selector stores the other planet, aspect type, and editorial
importance. Importance is editorial metadata, not an ephemeris fact.

Drafts can be incomplete. Publishing an enabled composition requires at least
one enabled required module and all its authored sources. No runtime model
approves, rewrites, or generates its sentences. Source order and removals are
saved atomically, including after reopening a draft.

## Reader selection and calculated facts

Selection remains: selected motion-specific article → shared complete article
→ enabled complete V5 composition → existing evergreen sections. TLDR,
retrograde opening, and occurrence additions retain their existing paths. The
complete-article fields accept the selected placement's named Writing Library
sources as well as existing calculated article variables. Source values stay
in `ingress.sources`; `ingress.enabled` only selects the separate composition
fallback. Existing inline Sky variables remain compatible.

New calculated variables: `passEntryDate`, `passExitDate`, `firstEntryDate`,
`finalExitDate`, `returnDate` (next pass entry), `priorPassYear`, `currentYear`
(selected pass entry year), `previousSignTitle`, `ingressVerb`,
`aspectPlanetTitle`, `aspectType`, `aspectVerb`, and `aspectExactDate`.
Existing `entryDate` and `exitDate` keep their residency meaning. All dates use
the selected timezone. Motion at the entry crossing determines “enters”,
“re-enters”, or “moves back into”; current retrograde motion does not stand in
for crossing motion.

Timing selects single pass, otherwise final pass, first pass, or intermediate
return pass. Long duration means at least 90 elapsed days from first entry to
final exit, including gaps; it is independent of pass chronology. A gap between
passes has no active-pass timing. No dates or planetary examples from the
proposal are used as calculation fallbacks.

Only defining aspect modules receive prose. Matching exact events are deduped by
event ID and ordered by timestamp then ID; the first matching enabled module wins
in saved module order. At most two events get modules. This uses the existing
in-sign event scope, excluding residency gaps and the Moon. Chiron has no aspect
list in this provider. Unsupported or missing facts remain absent.

## Verification

`npm run test:sky-evergreen-sections` covers Node/browser/shipped resolver parity,
source hashes, article priority, incomplete modules, timing, timezone dates, API
draft/publish/reopen/removal behavior, and the actual published reader loader.
`tests/visual/sky-ingress-composer.spec.ts` covers desktop/mobile and light/dark
Studio authoring, including governed prefill, the grouped writing-library entry
point, and the advanced source editor. Existing placement reader regressions
protect full authored copy. The package bundle, version pins, and generated
manifests must be rebuilt with every serving behavior change.

## Inline phrase variables in Placement articles

The three complete article fields support literal prose, calculated variables,
and Writing Library tokens. The Variables button opens Calculated Sky variables
and Editable phrase variables. Insert retains the token at the cursor. Inserting
or pasting a phrase prepares the Writing Library in the draft from governed
sources, preserving local text and links. It never enables or publishes writing.

Draft and saved previews use the same pure article source resolver as the reader.
Missing phrases remain visible as draft gaps and block publication, even when
composition is disabled or absent. The reader refuses incomplete articles; it
does not delete part of a sentence. Unused library fields remain optional.
Direct and retrograde articles use the explicit tokens the editor wrote; there
is no automatic motion suffix substitution or prose rewrite.

Links retain one-hop scope and SHA-256 checks. Changed or retired links require
review and relinking. Governed local prefill is a copy, not an automatically
updating link. Phrase text can contain calculated article variables but never
other phrase tokens, recursive references, or conditional blocks. Use entryDate
and exitDate for sign residency; pass dates and per-event aspect facts stay in
composition modules. No existing prose, phrase grammar, approval, or reader
selection precedence changes when this feature is installed.

### Article library preparation and verification

Inserting a phrase token or pasting an article template prepares missing Writing
Library fields in the same draft. Source loading belongs to the placement editor,
so switching between article and fallback sections does not cancel preparation.
Existing phrase text and exact links are preserved. Article preparation leaves
the composition's enabled state and module order unchanged.

Local sources resolve from the selected placement's `ingress.sources`. Exact
linked planet sources must match the planet; linked sign sources must match the
sign; placement and timing sources must match the complete planet/sign key. A
shared source draft leaves published dependent articles unchanged. After a source
revision is published, an older hash-pinned article fails closed until the new
source wording is reviewed, relinked, and the article revision is published.

Verification commands:

```sh
npm run test:sky-evergreen-sections
npm run test:content-studio-api
npm run build:admin
npx playwright test --config=playwright.sky-article.config.ts
npx playwright test -c playwright.config.ts tests/visual/sky-composable-reader.spec.ts --grep 'Placement article phrases' --workers=1
```

The article browser suite uses a fresh Studio preview and isolated rows. The
reader suite rebuilds the web application and calculates the occurrence with its
real ephemeris worker. The API suite exercises the actual handler, publication,
reader loader, and shared-source hash review using isolated storage.


## Calculated planet-in-sign dignity

`placementDignity` is a read-only calculated variable. The shared helper in
`apps/web/src/services/planetSignDignity.mjs` owns the existing seven-planet
sign table used by both chart badges and placement articles. Mercury in Virgo
keeps domicile **and** exaltation; Mercury in Pisces keeps detriment **and**
fall. Date and motion do not change this sign-level lookup. This does not
calculate peregrine, triplicity, bounds, face, or modern outer-planet dignities.

`placementDignityMeaning` is one complete paragraph, selected before rendering.
It uses the exact placement's complete saved paragraph when supplied, without
shortening or appending prose. Otherwise the calculated condition selects one
of six structural templates and requires `placementDignityMechanism` (an
independent clause) and `placementDignityExpression` (a verb phrase). Those
fields contain no final punctuation. Missing or wrongly scoped writing is an
editor/publication error, even when the selected dignity module is optional.
The template helper distinguishes natal and ingress wording; the existing Sky
composition and article consumers explicitly use ingress wording. This change
does not install Sky copy into natal articles or alter existing natal prose.

A valid pairing with none of the four major conditions uses the standard
planet-in-sign dignity paragraph. That is not peregrine; peregrine needs
triplicity, bounds, and face in addition to this sign-level lookup. Sky
reader copy omits the list of conditions that do not apply. A recognized
body outside the traditional seven-planet framework omits the paragraph as
not applicable. An unknown or missing identity is invalid, not a legitimate
empty lookup. An omitted paragraph must occupy its own article paragraph or
composition module, so surrounding sentences cannot become fragments. The
calculated occurrence must match the source's planet and sign.

The Sky Placement article starter is the dated ingress template. It is
opt-in and does not rewrite saved articles. Natal birth-chart wording is
kept in a separate template and is not inserted into Sky. Extra experience
fields remain opt-in and are not added automatically.

The Writing Library shows the condition and the three authored fields in the
existing Planet × sign group. New compositions use `{{placementDignityMeaning}}`
in the dignity module and remain disabled. Existing `dignitySentence` sources,
modules, exact text and hash-pinned links continue to work. **Migrate saved
dignity paragraph** copies an existing paragraph into the canonical field and
updates this draft's composition tokens only. It keeps the legacy source and
all enable/review/publication flags. Conflicting newer canonical writing blocks
migration. A not-applicable source cannot be migrated to automatic
omission: its existing authored paragraph remains on the legacy path.

No database backfill, approved-text edit, automatic enablement or publication
is part of installing these variables. The ordinary owner-controlled save,
review and publish path still applies. The variable catalog reserves both names
during compatibility; neither can become an unrelated global custom variable.

Verification: `npm run test:placement-dignity`, existing article/ingress tests,
and `npm run test:content-studio-api` cover deterministic selection, all 84
traditional planet/sign pairs, Node/browser/shipped parity, draft preview,
missing-source publication refusal and the actual installed reader payload.
