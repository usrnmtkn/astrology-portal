# Personal Transit primary and retained alternate

Owner authority: [the writing task](thread:01a13201-e1a0-75c0-ab9b-f1b8aa29d3ed).
The owner designated the supplied v21 You and Friend passages as owner authored,
primary and approved for publication. They selected the current app wording as
the alternate, approved primary-only publication where no exact alternate exists,
and expressly enabled the approved Lilith soft passages. The private source file,
exact-text hashes and approval record stay outside Git. This document contains
workflow instructions, not reader copy or a publication receipt.

## Import and approval

Personal Transit CSV exports include `keep_current_as_alternate`, defaulting to
`no`. Explicit `yes` retains the server's current live You and Friend strings,
headline and saved version before changing the primary. The alternate has its own
content hash and is not overwritten by subsequent primary edits. An unfinished
draft cannot become the retained alternate. Legacy audience mirrors are included
when their package record lacks one audience field.
If only one audience was saved, only that passage is retained. Selecting an
absent audience's alternate reports that no verified alternate is available;
the reader never manufactures it from the other audience or primary passage.

`primary_owner_authored=yes` requires an exact `owner_source_uri` thread reference.
For existing records, the publication action assigns that designation only when
both approved audience fields still match the imported strings. The claim does
not publish prose or approve another revision. Imports and original versions stay
in private editorial history; reader transport excludes that history.

Absent Personal Transit sources may use `content_id=new:{content_key}` and
`saved_version=v:new`, with `content_type=transit-to-natal-aspect`. Only valid
supported exact or hard/soft library keys are allowed. Creation uses the regular
authenticated create handler, always as a draft. It cannot retain a nonexistent
alternate. Existing-key collisions do not authorize replacement. The normal
explicit publication action and admission checks still apply. No CSV, preview,
model score or author designation publishes by itself.

## Selection and preservation

The primary remains the default reader passage. Studio's Reading preview options
can explicitly select the retained alternate, independently of the existing
contact variant and repeat-pass inputs. The choice is retained in the preview URL.
The editor displays the preserved audiences read-only beside the editable primary.
This is not an automatic rotation policy or an additional reader-facing control.

Alternate selection verifies the retained hash and reports the actual alternate
source fields. Missing or changed alternate text raises an error instead of
claiming that primary text is an alternate. Calculated timing and aspect tokens
are filled by the same renderer in both versions. No passage is shortened or
rewritten during selection.

Lilith trines and sextiles require an eligible exact-owner-approved exact or
soft-family source for that ordered contact. Missing or legacy-only soft copy
still produces a source gap. This scoped owner change does not enable squares,
change planetary calculations or create copy for missing contacts.

Studio identities and selectors admit those soft contacts. The daily peak search
calculates their candidates using the existing ephemeris geometry and timing;
reader approval still decides whether a passage may serve. Direct Swiss-date
regressions cover both trine and sextile candidates while excluding squares.

## Verification

`scripts/test-personal-transit-copy-versions.mts` exercises the actual draft,
version conflict, approval, public projection and shipped-reader path, plus
new group-key creation and Lilith admission. It is part of `test:content-studio-api`.
`tests/visual/personal-transit-copy-versions.spec.ts` verifies the CSV publication,
reopened editor and preserved audiences at mobile and desktop sizes in both themes.
Source and shipped renderer receipt parity remain covered by the existing transit
receipt suite. Fixture success is not evidence that production content changed.

## Bundle allocation

Final independent `npm ci --ignore-scripts` builds compare combined main
`3e340e267` with runtime source `15fa8ad85`, using Node 22.20.0, npm 10.9.3,
identical lockfiles and the Visual smoke workflow's synthetic Supabase settings.
The browser configuration also enables natal patterns through the actual browser
server factory. CSV creation and retained-copy fields remain in lazy modules.

| Configuration and gzip bytes | Main | Candidate | Added | Limit | Remaining |
| --- | ---: | ---: | ---: | ---: | ---: |
| Default CI app startup | 517795 | 518086 | 291 | 518200 | 114 |
| Default CI reader startup | 572937 | 573228 | 291 | 573350 | 122 |
| Default CI all JavaScript | 3625420 | 3626946 | 1526 | 3627700 | 754 |
| Browser app startup | 517799 | 518081 | 282 | 518200 | 119 |
| Browser reader startup | 572941 | 573223 | 282 | 573350 | 127 |
| Browser all JavaScript | 3625402 | 3627024 | 1622 | 3627700 | 676 |
| Deferred CSV module | 5682 | 6741 | 1059 | 7000 | 259 |
| Standalone Admin entry | 231587 | 231689 | 102 | 231900 | 211 |
| Standalone Admin all JavaScript | 795598 | 796949 | 1351 | 797150 | 201 |

Web startup caps increase by 300 bytes each and aggregate JavaScript by 2000.
The deferred CSV module cap increases by 1000 bytes: its 1059-byte growth fits
alongside 318 bytes of existing headroom.
Standalone Admin aggregate JavaScript increases by 1500 bytes. Its entry/largest
raw limit remains 795000: baseline 794448, candidate 794994, six bytes remaining.
All other chunk, memory graph, dependency, source-payload and runtime performance
limits stay unchanged. CSS remains 119040 bytes in both web configurations.
There are no new dependencies or bundled owner passages. Final exact-head gates
and production verification remain required.
