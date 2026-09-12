# Sky placement source editing

The live Sun placement article and an imported article template are separate sources. Moving imported horoscopes into structured fields does not publish that template or replace the live placement article.

## Owner editing path

1. Open Content Studio → Sky Write-ups → Placements & lunations.
2. Select the planet or point and zodiac sign.
3. Use the section editor buttons above Writing path. The placement article, TLDR What, and TLDR Takeaway open their own fields. The colored passages remain editable links too.
4. For Sun in Aries, Cancer, Libra, or Capricorn, select the seasonal preview hemisphere and open the seasonal context editor. The reader selects that paragraph using the location; the Studio selector only changes the example.
5. Save & publish applies the edited source through the existing approval transaction. Save draft retains an unpublished revision.

The writing field appears before composition and evergreen controls. A source opened from a section action focuses and scrolls to that field after the deferred editor mounts. Unchanged seasonal package sources show No changes, with saving disabled, like placement articles.

Saved preview includes saved drafts and is not a claim that every displayed field is currently selected by the published reader. Dates, active event additions, aspects, and personal horoscopes have separate inputs. Imported templates shown in the library are distinct records.

## Source relationship

- `sky-placement/article/{planet}/{sign}` owns the placement fields and evergreen alternatives.
- `sky-placement/retrograde/{planet}` owns the shared retrograde opening.
- `sky-placement/seasonal-context/{sign}/{hemisphere}` owns the seasonal paragraph. The twelve existing sources cover four seasonal signs and northern, southern, and neutral variants.
- `sky/article-template/{planet}/{sign}` is the imported template, with its own review and publication state.

The Studio assembly now includes the selected seasonal source between the TLDR fields and the main article, matching the canonical reader. Node and other nonseasonal article order is preserved. No reader wording, resolver precedence, published data, or calculation behavior changes in this release.

## Verification

The actual generated-content API test edits and publishes all twelve seasonal sources twice, preserves original fields, installs the resulting publication through the actual dashboard loader, and checks the reader's full seasonal and placement payloads. The full Content Studio API gate includes this test.

Browser regressions cover desktop/mobile and light/dark, direct article and TLDR actions, full field values, focus and viewport placement, typography, all three hemisphere variants, seasonal save/reopen, and switching to a nonseasonal sign. Separate parity assertions compare all twelve seasonal source combinations with the reader. Existing Saturn article and evergreen editing flows cover the reordered controls.
