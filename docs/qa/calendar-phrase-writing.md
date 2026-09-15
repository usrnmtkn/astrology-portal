# Monthly phrase authoring in Content Studio

## Scope

The owner requested a composable monthly template with phrase-level AI drafting,
not whole passages hidden in `monthlyOverview` and `seasonOverview`. This change
adds **Generate monthly draft** to Calendar Write-ups → Monthly Sky. The existing
saved Calendar template remains untouched; opening the action creates no row.
This is a monthly authoring workspace, not a replacement for public Calendar or
for the independently managed horoscope templates.

The composer supports editable registered nested template definitions, literal
phrase values, calculated facts, conditional/inverted sections and event
collections. A bounded parser detects cycles, malformed tokens, unknown variables
and attempts to shadow calculated facts. No eval, dynamic property access,
prototype traversal, or template execution inside source prose is used.

Opening/closing season focuses are separate from zero, one or two event-supported
monthly themes. The owner can replace the suggested lead and up to two supporting
planetary events. Suggestions are editorial rules, not astronomical importance
measurements. The New Moon, Full Moon, solar and lunar eclipse collections are
separate. A classified eclipse never repeats as an ordinary lunation. All event
values are bound to stable event IDs, not ordinal slots. The exact month, year
and editorial timezone define an edition.

## Source and memory boundaries

`api/admin/calendar-phrase-writing.ts` verifies the existing owner session or
configured emergency secret. Anonymous development and forged bearer requests
cannot enter this authoring surface. Facts are recalculated server-side using the
same Swiss engine as Calendar; client dates, signs and classifications are not
accepted. A changed facts fingerprint requires refreshed context.

Before writing, the canonical production evidence adapter and pre-call gate
resolve each requested target. Memory Map supplies required current rulings;
the canonical positive owner voice selector supplies complete, hash-verified
owner-published register examples. Historical examples never establish the
selected month's dates or events. At least three eligible owner references are
required. The canonical WRITER Responses wrapper/provider and instruction
registry are reused. No new provider account or automatic provider call is added.

Existing private Studio feedback is read when enabled, but its present Sky-card
and Sky-article approved scopes are not widened to monthly phrases. It is excluded
and that scope limit is visible. This release does not activate new corrections
or promote drafts into memory. Graph similarity is not approval.

The source checker marks unsupported targets before generation. In particular,
the current catalog does not provide governed eclipse meaning for every sign.
Such phrase fields remain manually editable and visibly need a source; ordinary
Moon, natal or unrelated eclipse prose is not substituted. Required memory outage
blocks a provider call, but does not hide already saved drafts from the editor.

## Editing and persistence

AI returns only requested, unlocked phrase values. The JSON response cannot
replace patterns, add unrequested fields or inject nested delimiters, HTML,
dates, degrees or paragraph bodies. The preview retains unresolved phrase
placeholders until written. Each suggestion must be explicitly applied.

Only explicit **Save monthly draft** writes an edition. **Save reusable template**
is a separate confirmed action. The storage API uses version-checked writes and
deterministic first-insert identity; conflicts and timeouts are not retried.
Published source articles, legacy templates and public reader text are unchanged.

Generated phrase attribution is retained as signed, metadata-only receipts with
source identifiers, fingerprints and text hashes. Private correction bodies and
provider prompts are not stored in these records. Receipts cannot authorize
publication. Edits made by the owner are marked as edits, not invented owner-
authored source material. Persisted receipts survive signing-key rotation.

The two keys are:

- `slot-template/calendar/monthly-composition/v1`
- `slot-template/calendar/monthly-composition-edition/YYYY-MM/<encoded-timezone>`

Rows are `DRAFT` / `reference`. Both reader-eligibility predicates explicitly
exclude these keys, even if a status is accidentally changed. No publication,
approval or feedback-activation action exists in this endpoint. Existing editor
navigation guards and before-unload protection cover unsaved composer changes.

## Deliberate limits

This release implements pattern/phrase editing, reviewed event selection,
source-supported AI suggestions and saved monthly drafts. It does not implement
auto-publication, a new generic approved phrase library, automatic variation
rotation, monthly correction activation or new horoscope generators. Saved
edition values render without further AI calls. A source gap is an actual gap.

## Verification

- `node --import tsx scripts/test-calendar-phrase-authoring.mts`: nested templates,
  guards, source bindings, real Swiss September and August 2026, protected targets,
  canonical provider mock, receipt integrity, actual API contract, source outage,
  conflict-safe storage and reader exclusion. Provider calls are intercepted.
- `npx playwright test tests/visual/calendar-phrase-writing.spec.ts`: actual built
  Content Studio navigation and actual handler with isolated storage/provider
  fixtures, 390/1440px light/dark, explicit apply, saved receipts, save/reopen,
  unsaved navigation, failed save preservation and memory-source failure.
- Existing `test:content-studio-api`, `test:agent-memory`, `test:reader-copy-boundary`,
  `qa:css-audit`, TypeScript and production build remain release gates.

Tests never publish production content, activate private feedback, or incur model
charges. Runtime packaging must include every Memory Map source and governed
writer asset; browser code may import only the shared receipt types, not server
memory/provider modules.

## Measured lazy-feature allocation

Separate base `fe56c4a2` and feature worktrees used independent copies of the exact installed dependency artifact and the workflow Supabase configuration. Gzip uses level 9. Remote source status was checked through the authorized GitHub connector, not stale local refs.

| Gzip bytes | Base | Feature | Change |
| --- | ---: | ---: | ---: |
| Admin initial entry | 180,132 | 180,192 | +60 |
| Admin all JavaScript | 482,747 | 491,286 | +8,539 |
| Web app startup | 437,773 | 437,809 | +36 |
| Reader startup including CSS | 487,597 | 487,633 | +36 |
| Web all JavaScript | 3,097,281 | 3,105,943 | +8,662 |

Allocate 9,000 aggregate bytes in each build for this measured feature, retaining all entry, raw/largest-chunk, reader startup, CSS, Memory Map and forbidden-payload gates. The Admin checker requires `MonthlyPhraseStudio` outside the initial static graph. The initial synthetic merge with main `566ed6bb` measured 492.0 kB aggregate Admin JavaScript; its only Admin size failure was the previously unallocated aggregate feature.

The initial Vercel preview failed and the connected account was denied project-team log access. No deployment cause or successful production release is claimed.
