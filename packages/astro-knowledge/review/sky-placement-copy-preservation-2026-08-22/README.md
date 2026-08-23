# Sky Placement copy-preservation audit

Date: 2026-08-22

## Finding

The house-coverage materializer treated compact owner-approved knowledge-matrix
rows as finished Sky horoscope copy. That decision displaced known exact
planet/sign/house passages. It did not edit the longer passages in place; it
selected a different, shorter content family for the same reader surface.

The current deterministic inventory records 592 unresolved selection
conflicts. Each conflict has a serving matrix row and a separate exact approved
planet/sign/house candidate. The exact texts, hashes, word counts, approval
evidence, and source keys are recorded in `conflicts.json`. The inventory is a
review artifact only and does not authorize a serving change.

## Confirmed restoration

`house-horoscope-core/jupiter/leo/house-5` is restored from the owner's exact
250-word passage supplied on 2026-08-22. Jupiter in Leo houses 7 through 12 are
moved from the generated content inventory into the protected authored-input
source without wording changes.

Jupiter in Leo houses 1 through 4 and 6 have exact approved transit candidates,
but the repository does not contain the longer owner passages described in the
current task. They remain in the review inventory rather than being rewritten
or promoted without an exact owner decision.

## Prevention

Protected owner-authored house passages now live in a non-generated source of
truth with their exact word counts and SHA-256 hashes. Materialization fails if
either value changes. The materialized rows carry the same protection metadata,
and the content-inventory test verifies byte-for-byte parity through the serving
inventory.

Repository governance now states that owner-authored passages are indivisible.
A shorter treatment must use a separate field or content key and requires
approval of that exact wording.
