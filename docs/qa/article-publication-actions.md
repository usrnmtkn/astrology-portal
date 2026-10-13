# Article publication actions

The dated Sky article editor saves revisions automatically. Saving a revision
keeps the published edition intact; the owner reviews and publishes the exact
saved changes. The editor now uses the shared persistent save bar for that
journey rather than hiding the action below the full article and preview.

The bar distinguishes a saving draft, failed save, saved unpublished changes,
an unpublished complete edition, and unchanged published copy. Review & publish
opens and focuses the existing complete field comparison. Publication remains
version checked and uses the existing owner action. Errors stay inside the
editor; uncertain publication still uses the existing receipt recovery. After
publication the bar offers Read published article. Done closes a saved editor.
The header checks the actual saved revision, rather than the original LIVE row.

## Local acceptance

Base: refreshed main `e933bddd43944dbeeb23cdbc5c973fa43bc76de6`.
Release branch: `fix/article-crud-ux-20261012`, transferred onto refreshed main
`b9cbd314cef83745026a152c7e0b55ee9e34e6f8` in a fresh clone of the cleaned repository.
All content writes in these tests use isolated synthetic storage.

| Criterion | Result |
| --- | --- |
| Edit and autosave; preserve the original published edition | Passed, actual-handler browser fixture |
| Reopen saved changes without a redundant autosave | Passed, browser observes past the save debounce |
| Find publication controls while scrolled; distinguish saved from published | Passed, action-bar bounds within viewport |
| Review exact changed fields with keyboard focus | Passed, focused existing review section |
| Publish and reconcile saved revision and original edition | Passed, actual handler and persisted row assertions |
| Publication refusal preserves draft and displays error; retry succeeds | Passed, isolated refusal followed by actual handler publication |
| Link to published article | Passed, exact content-key destination assertion |
| Phone/desktop and light/dark, draft edition and published revision | Passed, eight web-entry browser scenarios |
| Standalone Studio publication failure/recovery | Passed, final fresh admin build; all eight scenarios passed, including the phone refusal/retry case |
| CSS/token integrity, admin typecheck, reader-copy boundary, diff whitespace | Passed |
| Complete API gate | Local article/CRUD/publication and lunar/horoscope checks passed; the complete local command stopped at missing protected report evidence. Temporary link removed after access was denied. The required hosted workflow uses its existing configured secret and must pass on the exact release head before merge |
| Live Libra publication and release | Pending release verification; saved article wording and publication state are unchanged by this code change |

Run `npx playwright test tests/visual/studio-article-memory.spec.ts` through the
existing registered web-entry config. It builds the current checkout and starts
a fresh preview without reusing an existing server. The standalone Studio
acceptance used a temporary local config; no extra unregistered config is shipped.

## Sky write-up heading correction

Owner direction on October 13, 2026: remove headings outside the design;
Overview does not belong in the Sky placement write-up.
Source: `thread:01a13342-dfba-70d0-99fd-c01d54172314`.

Unheaded article openings now compile without an invented label. Current and
archived Sky placement pages suppress the legacy Overview heading while keeping
its complete prose. Existing scaffold-label suppression remains in place;
authored section titles and the designed article sections remain intact.
The shared Friends detail routes are outside this new suppression.

Focused compiler, authenticated ingress Studio/publication, reader-copy boundary,
and CSS/token checks passed. The reader regression checks opening/final prose,
absence of Overview, authored heading order, reload and typography across phone
and desktop in both themes. No saved owner text or publication state was changed.

## Release size measurement

After integrating loader main `8d0d4b777`, independently installed matched builds
compare that main with article head `4eb3ff875` using identical visual-smoke
Supabase settings. Web aggregate gzip is 3,624,460 → 3,624,647 bytes (+187);
Sky detail is 6,101 → 6,149 (+48). Standalone Studio entry raw/gzip/aggregate is
793,833/231,561/795,201 → 794,706/231,832/795,451 (+873/+271/+250).

The release budgets account for these small additions to the existing controls
and deferred reader renderer. Startup, CSS, other chunks, dependencies and
publication checks keep their existing limits. No prose or publication-state
change is included; this is an interface cost, not a performance claim.

Exact-head hosted auth CI at `7332b761d` measured 3,624,878 aggregate web gzip
bytes, 231 above the matched local build. The 3,625,000-byte aggregate ceiling
leaves 122 bytes over that hosted measurement; all other limits stay unchanged.
