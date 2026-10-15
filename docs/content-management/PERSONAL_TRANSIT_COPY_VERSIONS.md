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
