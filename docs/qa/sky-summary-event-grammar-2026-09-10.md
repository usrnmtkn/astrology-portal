# Daily Sky Summary event grammar

Owner request: current task `01a08b82-0b3a-77d2-90fd-cfc0a527231a`, 2026-09-10.
The complete replacement Virgo New Moon clause is preserved with its SHA-256
and word count in `docs/content-review/sky-summary-owner-revision-2026-09-11.json`.
Publish that exact clause through Content Studio. The Sun source is unchanged.

## Reader contract

- The Sun and Moon meanings have separate sentences, with complete calculated
  placement links. The current lunation uses its own event-specific Moon source.
- Ingresses and stations precede exact aspects. Empty groups produce no paragraph.
- One/two/three-or-more exact aspects have separate agreement rules. Ingresses
  distinguish one from multiple. Counts and lists are computed, never pasted
  from an example date.
- Join a single retrograde station to the current Rx count only when its exact
  timestamp is at or before the snapshot timestamp and its planet is in that
  snapshot's retrograde list. Future, direct, multiple, unknown-time, and
  unmatched stations keep an independent sentence.
- An unchanged Rx list follows the events as background. It never interrupts
  the Sun/Moon opening. No importance score is invented for individual aspects.
- Preserve complete approved ingress TLDRs when available; never shorten owner
  passages to force the example's paragraph length.
- Former exact default templates normalize to current wording in Studio and
  the reader. Preserve genuinely customized templates. Reject new assembly
  wording containing “Also today,” “There is/are,” or “Today brings.” The
  legacy JSON is migration evidence, never the default reader template.

## Verification on future updates

Run `npm ci`, `npm run build:knowledge`, `npm run test:sky-daily-summary`,
`npm run test:content-studio-api`, `npm run typecheck`, and `npm run qa:css-audit`.
The event-grammar test asserts the full owner example, cardinality, chronology,
source integrity, saved-template migration, and custom layout omissions.

Run the fresh Studio browser suite and the daily summary, paragraph, supplied
copy, and Sky placement aspect browser tests. Check desktop/mobile and both
established themes. Verify the real production route after main's deployment;
for the owner's New York example use September 10 locally while keeping the
September 11 UTC lunation link. Confirm exact revised Moon and unchanged Sun
wording from the live reader and reopen the published Studio source.

## Measured release size

The fresh build with CI's Supabase configuration measures 422,509 bytes of
startup JavaScript and 470,706 bytes including startup CSS (CI measured 422,512
and 470,709). The new shared grammar, station timestamp guard, and exact former
default migration exceed the previous caps by 509/456 bytes locally. Allocate
1,000 bytes to each startup cap for this requested behavior. All CSS, total
JavaScript, and per-route caps stay unchanged; no dependencies or source banks
were added to the reader. `npm run qa:bundle` must still pass.

The Linux desktop Sky baseline was reviewed and refreshed from CI run
34560224392 after the intentional sentence/paragraph changes. The wheel and
navigation are unchanged; the taller summary moves the following cards down.
The dark Sky baseline is a controlled loading state and stays unchanged. No
screenshot tolerance or assertion was relaxed.
