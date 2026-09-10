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
opens its source editor. “Add placement composition” creates blank named sentences
and the proposed module structure. Enabling it makes it eligible after publication.

Each sentence shows its exact reference, such as
`sky-placement/article/saturn/aries#ingress.sources.responseSentence`.
Add named sentence sources and sections, edit each section template, and move
whole sections up or down. The template is executable data, not documentation
of another order. Required sentences stay together: an incomplete optional
module is omitted as a unit; an incomplete required module prevents this
composition from supplying the body.

Saved preview (Draft preview in the editor), Main template, and Assembly and omissions use the same pure
assembler as the reader. The map links sentences to exact editor fields and
explains every skipped section. Blue means calculated facts, purple means
reusable planet/sign sentences, amber means other authored writing.

The Sky variable key inserts calculated variables into the selected sentence.
Section templates also accept the names of this composition's sentence sources.
Sentences accept facts only. Nested source expansion and conditional mustache
blocks are rejected. A malformed or unknown variable reports an editor/save
error; a missing calculated value omits its dependent module without deleting
words from a sentence.

Occurrence preview calculates residency and aspects using the ephemeris worker.
It uses the selected date, or the next pass when the date is outside the sign.
The draft preview includes unsaved writing. “Open published reader for this
occurrence” opens the real reader route for the calculated date, using that
reader’s location and timezone. This avoids a second publication implementation
and keeps the reader’s content libraries out of Studio’s build. The reader may
use its last known good cache during a storage failure. Retrograde-cycle variables remain
unavailable unless the calculation supplies that complete cycle.

## Stored contract

`ingress` is an atomic version-5 object: `enabled`, `sources`, and `modules`.
A source contains `kind` and `text`, or `kind` and an exact
`reference: { contentKey, field, sha256 }`. An exact reference points to one
local sentence on an existing canonical placement source. Planet sentences
can be reused only for the same planet; sign sentences only for the same sign;
placement and timing sentences only for the same planet/sign source.
References cannot point to references. Hash mismatch, retirement, or absence
makes the reference unavailable. Relinking requires reviewing the new text.
The existing publication transaction checks required referenced writing in
one batched lookup. The reader resolves only its eligible published snapshot.

A module stores a stable ID, editorial label, template, enabled/required flags,
and motion, duration, and timing selectors. Labels are never reader prose.
An optional aspect selector stores the other planet, aspect type, and editorial
importance. Importance is editorial metadata, not an ephemeris fact.

Drafts can be incomplete. Publishing an enabled composition requires at least
one enabled required module and all its authored sources. No runtime model
approves, rewrites, or generates its sentences. Source order and removals are
saved atomically, including after reopening a draft.

## Reader selection and calculated facts

Selection remains: selected motion-specific article → shared complete article
→ enabled complete V5 composition → existing evergreen sections. TLDR,
retrograde opening, and occurrence additions retain their existing paths.
The complete-article fields do not accept sentence-source aliases; use the V5
section templates for assembly. Existing inline Sky variables remain compatible.

New calculated variables: `passEntryDate`, `passExitDate`, `firstEntryDate`,
`finalExitDate`, `returnDate` (next pass entry), `priorPassYear`, `currentYear`
(selected pass entry year), `previousSignTitle`, `ingressVerb`,
`aspectPlanetTitle`, `aspectType`, `aspectVerb`, and `aspectExactDate`.
Existing `entryDate` and `exitDate` keep their residency meaning.
All dates use the selected timezone. Motion at the entry crossing determines
“enters”, “re-enters”, or “moves back into”; current retrograde motion does not
stand in for crossing motion.

Timing selects single pass, otherwise final pass, first pass, or intermediate
return pass. Long duration means at least 90 elapsed days from first entry to
final exit, including gaps; it is independent of pass chronology. A gap between
passes has no active-pass timing. No dates or planetary examples from the
proposal are used as calculation fallbacks.

Only defining aspect modules receive prose. Matching exact events are deduped
by event ID and ordered by timestamp then ID; the first matching enabled module
wins in saved module order. At most two events get modules. This uses the
existing in-sign event scope, excluding residency gaps and the Moon. Chiron
has no aspect list in this provider. Unsupported or missing facts remain absent.

## Verification

`npm run test:sky-evergreen-sections` covers Node/browser/shipped resolver parity,
source hashes, article priority, incomplete modules, timing, timezone dates,
API draft/publish/reopen/removal behavior, and the actual published reader loader.
`tests/visual/sky-ingress-composer.spec.ts` covers desktop/mobile and light/dark
Studio authoring. Existing placement reader regressions protect full authored
copy. The package bundle, version pins, and generated manifests must be rebuilt
with every serving behavior change.
