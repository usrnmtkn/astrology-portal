# Calendar Moon-sign editing

Calendar Write-ups defaults to leftover Moon-sign passages under the Day and
Week Moon story job. Choose a Moon sign or search for a title such as
`Moon in Libra`. The selected passage and its edit action appear before the
result list; each result also opens its own editor. Results expand in groups of
twelve. Lunation articles, timing sentences, event readings, and Sky-shared
summaries are separate families. Changing filters returns to Write-ups so a
stale composition selection cannot obscure the matching passages.

Adding is a separate, secondary action called **Add leftover write-up**.
Both this action and the header Create menu open the same sign chooser. No sign
silently defaults to Aries, and the menu cannot create an unassigned source key.
The chooser explains existing leftovers, offers **View saved write-ups**, and
disables **Start draft** until inventory is loaded, a sign is chosen, and an
allowed variant is available. Archived slots still count; the excluded Cancer
base is never recreated. The editor identifies the new leftover and opens
with blank writing. Opening the editor does not save a record. Source keys stay
`authored/calendar-weekly-moon/...`.

The five Calendar browser cases cover existing edits, archive/restore, blank
sign selection, full slots, both Create entry points, separate draft creation
through the real handler, and preservation of the existing Libra passage.
The added panel uses the shared card, heading, form and action styles.

The quoted Libra write-up is `authored/calendar-weekly-moon/libra/variant-2`.
Its complete body remains in `source-rows/transit-synastry-rows-v1.json`, and
`renderWeeklyMoon` selects that same authored identity. This UI change does not
modify reader copy, selection, or publication policy. Saved drafts use the
existing package revision editor; explicit publication retains the full body.

Verification:

- `tests/visual/calendar-moon-editor.spec.ts` uses the actual generated-content
  handler with isolated storage, production-shaped inventory hydration, and
  the complete Libra source. It checks sign/title lookup, direct edit, draft
  save/reopen, publication, empty-state recovery, pagination, desktop/mobile,
  actual Studio light/dark themes, shared heading styles, and document order.
- `scripts/test-content-studio-api-roundtrip.mjs` verifies the Libra identity
  through draft/publish and the actual reader loader, including repeat edits.
- The existing Calendar browsing/composition/CRUD browser case remains covered.
- All five fresh-build Calendar browser cases pass on the rebased code, including
  390px and 1440px in light and dark themes. No browser runtime errors occurred.
- The full unfiltered `npm run test:content-studio-api` suite passes locally.
- Admin typecheck and the complete CSS/token/architecture audit pass. The new
  controls use existing shared styles and introduce no CSS overrides.

Bundle allowance: compared with main `120ae1dbf`, the direct-edit controls and
separate draft chooser add about 1 kB aggregate gzip. The build measures 451.7 kB
aggregate, 178.2 kB entry gzip, and 619.7 kB entry raw. The aggregate allowance
increases from 451,000 to 452,000 bytes for this implemented interface. Startup,
largest-chunk, memory-graph, lazy-boundary, and forbidden-payload limits remain
unchanged. LunarCalendarWorkspace stays deferred; no runtime dependency or
reader-content payload is added.
