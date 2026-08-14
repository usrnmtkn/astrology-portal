# Friends natal copy visibility owner override — 2026-08-14

## Owner direction

> roll back whatever logic is hiding copy

## Applied interpretation

The 40-row Friend vocabulary fail-closed boundary introduced in PR #236 is
removed. Vocabulary slots now resolve existing copy for both voices using the
same field precedence:

- You: `body_you ?? body`
- Friend: `body_they ?? body`

The existing 40-row inventory remains in the repository as audit evidence, but
it no longer suppresses rendering. This restores all 720 vocabulary rows and
the complete modeled Friend natal placement matrix, including the reported
Sun-in-Aquarius-in-the-7th-house page.

## Accepted consequence

Some of those 40 existing rows contain second-person language. Restoring the
copy can therefore surface `you` language inside Friend passages until governed
Friend-specific wording replaces it. No copy, approval state, or canonical
source row is changed by this override.

## UX boundary retained

The shared empty-detail guard remains. It prevents genuinely body-less details
from opening but does not suppress any row whose resolver returns existing
copy.
