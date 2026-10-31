# Dignity date preview

Sky Write-ups → Detriment and fall has a **Preview by date** disclosure. It
selects one complete saved review draft by the same exact planet/sign/motion
identity used by Sky. It never combines separate single-planet narratives.

The controls cover today through the day before the same date next year, in the
selected Sky location's timezone. The reference defaults to noon; the owner can
choose a time to inspect a sign change or station within a civil day. Invalid
dates, dates outside the range and nonexistent daylight-saving times fail
without displaying an earlier result. Date/time remain in this Studio route's
hash parameters across reload. They do not change the reader's selected date.

Opening the disclosure requests complete reference-draft documents through the
existing owner-only inventory API (`view=detail`, `status=DRAFT`, bounded,
paginated prefix). Calculations use Sky's existing off-main-thread engine;
only current, tropical, geocentric Swiss results with all seven classical
positions may select a reading. Motion is never inferred from the draft's
title or review-key slug.

Selection uses `source_snapshot.exactReadingScope`, validates the recorded
placement tuple against the canonical exact key, and rejects duplicate matches.
Mercury in Pisces contributes one planet with two conditions. A missing draft
is reported as a gap. No smaller subset or different motion is substituted.
Zero qualifying planets hides the reader section. Calculation or storage errors
remain distinct from a genuine missing match.

The complete current saved body is rendered with the production assembler and
inline presentation. A reversible placement-list substitution must reproduce
the saved body exactly. Historical import templates cannot restore old wording.
An incompatible edited body fails for review. Opening the selected draft uses
the existing versioned editor; the preview itself has no save, generation,
approval or publication action.

The preview is explicitly labeled **Saved draft · Not published**. It simulates
which exact draft would match the calculated sky; publication eligibility on
the public reader remains unchanged. Draft coverage does not publish a reading.

Verification commands:

```sh
npm run test:placement-dignity
npm run qa:css-audit
npx playwright test -c playwright.sky-debility-drafts.config.ts
node scripts/check-admin-bundle-budgets.mjs
```

The focused regression compares four requested dates with independent direct
Swiss calls, exercises range/DST validation, exact matching, duplicate/missing
bindings, and stale/incomplete facts. It also calls the actual owner inventory
handler against 51 isolated synthetic records and verifies anonymous denial,
full bodies and binding metadata, and GET-only storage requests. Browser tests
cover single and combined readings, complete opening/final paragraphs, reload,
opening the selected draft, disabled publication, loading/error/retry states,
and desktop/mobile light/dark typography and alignment. Existing saved-draft
navigation regressions remain in the same fresh-build run.

Private read-only acceptance additionally checks all 45 required configurations
against the current 51 saved records. Complete saved bodies must be identical;
no owner prose enters fixtures, Git, public assets or QA attachments. Production
records are hash-checked before and after development. No owner record is used
for write tests. Local acceptance does not establish a hosted deployment.

The measured standalone Studio baseline at main
`b2babfec34847ff7207db111e9cd81cdece40577` is 808440 raw entry bytes, 234181
entry gzip bytes and 846834 aggregate gzip bytes. The separately deferred final
feature is 808440/234180/850723: +0/-1/+3889. The aggregate allowance adds 4000 bytes
for this requested interface; entry, largest-chunk, memory, private-payload and
runtime boundaries remain unchanged. The date preview must stay a separate
dynamic entry, and calculations are requested only after opening it.

Matched integrated web builds measure 3654773 aggregate gzip bytes on main and
3658917 with the preview (+4144), with 252 and 253 JavaScript files. Allocate
4250 aggregate bytes for this Studio addition. Reader startup, App, CSS,
individual-chunk, privacy and runtime ceilings remain unchanged.
