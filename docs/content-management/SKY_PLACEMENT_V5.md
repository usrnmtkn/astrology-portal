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
- `planetFunction` ← approved `fallback-vocab/sky-planet-function/{planet}`, with
  the general planet-function row as fallback
- `planetProductive` ← approved `fallback-vocab/planet-productive/{planet}`
- `planetShadow` ← approved `fallback-vocab/planet-excess/{planet}`
- `signSummary` ← approved `fallback-vocab/sign-style/{sign}`
- `signCoreDrive` ← approved `fallback-vocab/sign-need/{sign}`
- `signMethod` ← approved `fallback-vocab/sky-sign-style/{sign}`, with the
  general sign-style row as fallback
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

Planet and sign vocabulary is editing material, not an automatic reader
paragraph. The default library fallback structure assembles only complete
placement sentences: opening hook, placement thesis, lived manifestation,
challenge/response, and takeaway. This prevents noun-phrase lore from being
pasted into the article as standalone prose. Planet/sign sources remain
available for deliberate insertion into a section template.

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
`{{placementThesis}}` belong in section templates; they are not inline calculated
variables. Nested source expansion and conditional mustache blocks are rejected.
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
complete-article fields do not accept sentence-source aliases; use the V5 section
templates for assembly. Existing inline Sky variables remain compatible.

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
