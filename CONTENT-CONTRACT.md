# TLDR Astro — Reader-Facing Content Contract (v1, Jul 21 2026)

This file is law for all reader-facing copy (house transits, aspects, dailies, compatibility).
It lives at the repo root. Every content-related change must comply with it. The executable
version of this contract is `scripts/test-content-contract.mjs`; that script is the arbiter.

## The rules

### R1. No empty slots
Every layout slot a card declares (tldr, headline, body, do, dont, area sections) must have
non-empty authored content. If a slot has no authored content, the layout must omit the slot
entirely. A card must never render a divider into blank space.

### R2. TLDR is authored, never derived
A tldr must never be the body's opening text, a truncation of the body, or otherwise derived
from the body at import or render time. If no authored tldr exists for a unit, the tldr field
is empty and the TLDR block is hidden. Truncation with appended ellipsis ("....", "…") is
forbidden everywhere in the pipeline: text renders whole or the unit fails QA.

### R3. No package artifacts
Markdown/package artifacts (`-----`, `###`, `***`, stray `{placeholders}` other than
`{friend}`, "undefined", "[object Object]") must never appear in a display field. These are
import defects, to be fixed at import, not stripped at render.

### R4. Author-final supersedes draft
When an author-final package covers a content key, any draft/V3 unit for that key is STALE
and must not be served. Stale units appear in the admin QA queue for replacement; they never
reach a reader.

### R5. Renderer renders or refuses — it never invents
A unit that fails contract renders nothing and logs its key. No fallback copy, no synthesized
sentences, no partial cards. `readerSafety.ts` (or any equivalent layer) is sanitize-only:
it may strip whitespace; it must not contain allowlists, fallback text, or logic that decides
which copy is acceptable. Content validity is decided once, at import, and recorded as
contract status.

### R6. Contract status is visible in the content admin dashboard
The admin dashboard has a Content QA view listing every reader-facing unit: key, surface,
source package, version (author-final | draft), contract status, and failure reasons. This
view is the work queue for the author. Silent degradation is a bug by definition.

## Enforcement

1. `scripts/test-content-contract.mjs` is committed UNMODIFIED and must pass. It may not be
   edited, weakened, skipped, or wrapped. If it seems wrong, stop and raise it with the
   author; do not adjust it.
2. The script reads content through `scripts/contract-adapter.mjs`, which the app team
   implements to expose every reader-facing unit from the real content pipeline (the same
   data the renderer sees, post-import). The adapter is glue only: it must not filter,
   repair, or normalize content on the way out.
3. The script runs in CI. A contract violation blocks merge.
4. Acceptance for any content-pipeline PR: the script passes, typecheck passes, and the
   three known-bad screens render correctly (Saturn through your 8th house: authored TLDR
   distinct from body or no TLDR block; Saturn square your Venus and Venus trine your Venus:
   no empty body under a divider).

## Known defect classes this contract exists to end

- TLDR duplicated from body with "...." appended (Saturn 8H screen).
- Cards rendering a TLDR and an empty body section (Saturn□Venus, Venus△Venus screens).
- `-----` divider artifacts reaching readers (Pluto 12H).
- Pre-final-voice copy served after author-final packages were delivered
  ("earning love like a wage").
- Blank cards "fixed" by loosening allowlists in readerSafety.ts.
