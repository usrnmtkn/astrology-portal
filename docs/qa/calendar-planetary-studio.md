# Planetary Calendar writing

Calendar Write-ups now includes Planetary ingresses and Planetary stations in
its tabs and sidebar. Select a planet and sign, and a station direction when
applicable. Open write-up checks saved identities before starting an empty
manual draft. Existing dated ingress entries remain individually editable and
retain their priority over reusable sign readings.

The editor uses `sky.ingress.{planet}.{sign}` and
`sky.station.{planet}.{sign}.{direction}`, which are consumed by the Calendar
reader. Supported legacy identities remain editable. Sun seasons, Moon
ingresses, and ongoing retrograde passages are separate editorial units.
No existing prose is rewritten or automatically published by this change.

New manual entries use the `calendar_event` block type. Save draft leaves them
unpublished; Save & publish makes the entered copy available to readers. The
reader retains every paragraph of these entries in cards and slide-outs. The
Studio live badge recognizes the same Calendar source keys.

## Verification

- `scripts/test-calendar-planetary-studio.mts`: actual handler create, read,
  inventory, publish, reader selection, live status, wrong sign/direction,
  stale writes, and authorization, with isolated storage.
- `tests/visual/calendar-planetary-studio.spec.ts`: fresh-build empty and saved
  states, failed lookup, save/reopen/publish, existing identity reuse, light and
  dark themes at 390 and 1440 pixels, and complete Calendar slide-out copy.
- Full `test:content-studio-api`, typecheck, CSS/token audit, and public asset
  privacy checks remain release gates. Fixtures do not write to a live service.

## Bundle measurements

Isolated checkouts with separate `npm ci` installations and identical workflow
Supabase placeholders compare main `aded63e76` against implementation `209096d1c`:

| Metric | Main | Planetary editors | Difference |
| --- | ---: | ---: | ---: |
| Entry raw bytes | 748,892 | 752,858 | +3,966 |
| Entry gzip bytes | 218,113 | 219,102 | +989 |
| Aggregate gzip bytes | 754,160 | 756,486 | +2,326 |

Allocate 4,500 raw entry/largest-chunk bytes, 1,000 entry gzip bytes, and 2,500
aggregate gzip bytes for the new navigation, identities and workspace. Enforce
the new workspace as a deferred entry. Dependency, CSS, memory-graph and
forbidden initial-payload limits remain unchanged.

### Web application allocation

The web application also includes the deferred Studio entry points. Separate
isolated builds using the browser workflow's environment measure 3,489,359
aggregate JavaScript gzip bytes on pre-feature main `3ef2237c9` and 3,492,579
on merged main `affba7fd7` (+3,220). Allocate 3,500 aggregate bytes, bringing
the web total cap to 3,493,000. This corrects the aggregate-budget CI failure
reported after #1070; it is an explicit feature allocation, not a size reduction.
All reader startup, CSS, individual chunk, memory graph and runtime-performance
limits remain unchanged. No dependency or prose payload was added.
