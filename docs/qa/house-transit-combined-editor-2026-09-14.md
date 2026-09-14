# Combined House Transit editor

The House Transits workspace opens the complete selected write-up in one editor.
Its title includes the planet, zodiac sign, natal house, and retrograde motion
when selected. You and Friends have separate audience tabs. The introduction,
sign-specific passage, and optional retrograde passage appear in reading order,
followed by a complete draft preview and one **Save all changes** action.

The introduction remains a source shared by all signs for its planet and house.
The retrograde overlay remains shared across that planet's signs and houses.
Those scopes are visible beside the fields. Existing flat passage previews and
inventory loading/error handling remain available in the workspace.

## Copy and save behavior

- Opening the editor fetches each complete document afresh. Inventory previews
  never initialize editable fields.
- Audience fields retain exact strings, including empty values and whitespace.
  Only changed fields are included in a proposal. There is no pronoun conversion,
  generated copy, or publication action in this editor.
- Each source keeps its original record and metadata. Changes use the existing
  package-draft API and the version captured at opening or the last acknowledged
  save. Saving does not approve or publish the proposal.
- Changed sources save sequentially. Acknowledgment checks the returned identity,
  changed version, and complete audience text. Only acknowledged sources clear
  their unsaved state; a failure keeps the remaining edits.
- A version conflict reports the API's explanation without overwriting newer
  content. After a timeout, an exact reread may acknowledge an already-committed
  write, but conflicting local text never receives a newer version silently.
- A legacy complete You passage edits its actual `body` field. Friends remains
  unavailable for that legacy source because the reader does not use it there.
- Close, Escape, browser navigation, and unload protect unsaved changes. An old
  full-source request cannot open a stale editor after a selection or route change.

## Regression coverage

`tests/visual/house-transit-combined-editor.spec.ts` uses the actual generated-content
handler with isolated synthetic storage. It covers both audiences at desktop and
mobile sizes in light and dark themes; exact complete text through save/reopen;
original records and metadata; blank/missing fields; partial-save retry; real
version conflicts; optional retrograde scope; legacy `body` routing; delayed
hydration cancellation; and focus/discard guards.

The existing House Transit loading and dashboard flows remain part of the focused
browser run. Browser verification builds the current web bundle and starts a new
preview with `reuseExistingServer: false`. No production content is written.

The implementation started at `b4a622a3c65fde3557f3744cfabc94c142c6e50f` and
incorporates main `27bf4b703` in branch `codex/combined-house-transit-editor`.
Local verification is not evidence of a production deployment or approval of any
reader wording.

## Bundle allocation

Independent before/after builds at the original base used separate worktrees,
separate `npm ci` installations, and the same workflow Supabase configuration.
They measured:

| Gzip bytes | Original main | Combined editor | Difference |
| --- | ---: | ---: | ---: |
| Web startup JavaScript | 429,588 | 429,582 | −6 |
| Reader startup including CSS | 479,212 | 479,206 | −6 |
| Total web JavaScript | 3,061,218 | 3,064,891 | +3,673 |
| Admin entry JavaScript | 176,423 | 177,784 | +1,361 |
| Total admin JavaScript | 457,080 | 460,585 | +3,505 |

The added editor module is deferred and measures 2,239 gzip bytes in the web
build. Allocate 4 kB aggregate in each application for this feature. Preserve
entry, startup, individual-chunk, CSS, memory graph, and timing limits. Main
27bf4b703 separately incorporates the previously missing zodiac-season delivery
allowance; this editor does not change those startup limits.

## Final local verification

On integrated main `27bf4b703`, with the uncommitted editor changes:

- All 24 focused browser tests passed from a fresh build: 17 combined-editor
  regressions, five loading/layout regressions, and two existing dashboard flows.
- The unfiltered `npm run test:content-studio-api` passed, including its local
  knowledge-build prerequisite and reader-copy boundary checks.
- Web and admin production builds, both bundle budgets, the CSS/token audit,
  House Transit source/CRUD contracts, and `git diff --check` passed.
- Repository and built web/admin asset privacy scans passed with the protected
  policy supplied externally.
- Desktop/mobile light/dark editor screenshots were visually inspected. Heading
  semantics, computed typography, complete preview whitespace, and overflow are
  asserted in the browser suite.

Local verification changed no source prose, owner approval, or production data.
The owner authorized committing, merging, and deploying this editor on September
14, 2026. The new 17-case browser spec is included in the Sky Studio CI test list.
