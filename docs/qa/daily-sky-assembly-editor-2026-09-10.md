# Daily Sky Summary assembly editor

Branch: `codex/daily-sky-assembly-editor`, based on `de8adbba`.

The full summary layout is now a Content Studio field at
`cms/sky-daily-summary/assembly/layout`. Single-brace slots select the opening,
current retrogrades, void of course, exact aspects, stations, ingresses, and
lunation. Blank lines define paragraphs. The opening is required; other
categories may be omitted or reordered. Duplicate and unknown slots are rejected.

Individual assembly sentences are editable in the same workspace. Existing Sun,
Moon, retrograde-introduction, VoC, future-lunation, and ingress TLDR keys stay in
place. Published rows use the existing serving/publication gates. Drafts do not
replace reader copy. The full layout editor opens the existing Save draft / Save
& publish workflow, including concurrency checks when reopening a saved row.

The preview uses the reader composer, with explicitly labeled editor examples.
It never sends those examples to the reader. Source interpretation bodies remain
unchanged. Article links remain structured parts rather than editable HTML.

Station events come from the calendar engine. `retrograde-passage` records are
ongoing motion, so they cannot generate a “stations today” sentence. Unknown
motion is omitted. Shadow timestamps exist on some cycle records, but this
calendar does not emit reliable daily shadow-boundary events; no shadow prose
variables have been added. A lunation earlier on the selected local day remains
“exact today” rather than being replaced by the next future event.

Validation includes all 144 Sun/Moon pairs, first/subsequent and singular/plural
events, reordered/hidden categories, station passage exclusion, publication
filters, preserved article targets, and a fresh-build Studio-to-reader browser
publish/reload flow. Mobile/desktop and light/dark Studio tests compare heading
styles against the existing section contract and capture the new assembly panel.

Performance: the Studio workspace now loads on demand. The initial admin entry
shrinks to approximately 609 kB raw / 172 kB gzip, below its unchanged limits.
The new editor, grammar, and safe renderer add a few kB across all routes; aggregate allowances include the requested functionality. A 50-byte overage in
the deferred Sky detail chunk after shared-graph minifier changes receives a
100-byte cap adjustment. Reader startup, App chunk, and CSS limits stay intact.

## Verification result

- Web and admin typechecks passed.
- Daily Sky unit suite passed, including the 144-pair source and composition checks.
- Fresh-build Studio browser suite: 13 passed (mobile/desktop, light/dark,
  source editing, full-template publishing, reopen/reload, and reader hydration).
- CMS template validation and Content Studio API round-trip checks passed.
- CSS audit, generated fallback manifest, and final web/admin bundle budgets passed.
- Final local reader at `http://127.0.0.1:4184/#sky` renders the current calculated
  station and ingress events and a same-day lunation in separate paragraphs.
  No Vite error overlay was present.
- Full `test:content` is blocked by the pre-existing
  `test-friends-owner-signoff-ruling.mjs:161` historical payload hash mismatch.
  Reproduced against an untouched `git archive` of base commit `de8adbba`, using
  only that test's source and review files; the actual and expected hashes are
  identical to the failing feature-worktree result. No governed Friends rows
  or approval records were changed or waived.

No commit, merge, production deployment, or remote content synchronization was
performed for this change. The final remote refresh still places the branch at
0 commits ahead / 0 behind `origin/main`, with this implementation uncommitted.
